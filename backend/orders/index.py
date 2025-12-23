import json
import os
from typing import Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, validator
import psycopg2
from psycopg2.extras import RealDictCursor

class OrderItem(BaseModel):
    product_id: int
    product_name: str
    product_article: str
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)
    
    @property
    def total(self) -> float:
        return self.quantity * self.price

class CreateOrderRequest(BaseModel):
    customer_name: str = Field(min_length=1)
    customer_phone: str = Field(min_length=5)
    customer_email: str = ""
    delivery_address: str = Field(min_length=5)
    delivery_method: str
    payment_method: str
    items: List[OrderItem] = Field(min_length=1)
    
    @validator('customer_phone')
    def validate_phone(cls, v):
        cleaned = ''.join(filter(str.isdigit, v))
        if len(cleaned) < 10:
            raise ValueError('Некорректный номер телефона')
        return v
    
    @property
    def total_amount(self) -> float:
        return sum(item.total for item in self.items)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Бизнес: Сохранение заказов клиентов в базу данных
    Args: event - dict с httpMethod, body, queryStringParameters
          context - object с атрибутами: request_id, function_name
    Returns: HTTP response dict с данными заказа
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    
    try:
        if method == 'GET':
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            params = event.get('queryStringParameters') or {}
            status = params.get('status')
            
            if status:
                cursor.execute(
                    "SELECT * FROM orders WHERE status = %s ORDER BY created_at DESC",
                    (status,)
                )
            else:
                cursor.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT 100")
            
            orders = cursor.fetchall()
            cursor.close()
            
            orders_list = []
            for order in orders:
                order_dict = dict(order)
                order_dict['created_at'] = order_dict['created_at'].isoformat() if order_dict.get('created_at') else None
                order_dict['updated_at'] = order_dict['updated_at'].isoformat() if order_dict.get('updated_at') else None
                if order_dict.get('total_amount'):
                    order_dict['total_amount'] = float(order_dict['total_amount'])
                orders_list.append(order_dict)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'orders': orders_list}, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            order_request = CreateOrderRequest(**body_data)
            
            cursor = conn.cursor()
            
            cursor.execute(
                """
                INSERT INTO orders (
                    customer_name, customer_phone, customer_email,
                    delivery_address, delivery_method, payment_method,
                    total_amount, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    order_request.customer_name,
                    order_request.customer_phone,
                    order_request.customer_email,
                    order_request.delivery_address,
                    order_request.delivery_method,
                    order_request.payment_method,
                    order_request.total_amount,
                    'new'
                )
            )
            
            order_id = cursor.fetchone()[0]
            
            for item in order_request.items:
                cursor.execute(
                    """
                    INSERT INTO order_items (
                        order_id, product_id, product_name, product_article,
                        quantity, price, total
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        order_id,
                        item.product_id,
                        item.product_name,
                        item.product_article,
                        item.quantity,
                        item.price,
                        item.total
                    )
                )
            
            conn.commit()
            cursor.close()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'order_id': order_id
                }, ensure_ascii=False),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}, ensure_ascii=False),
            'isBase64Encoded': False
        }
    
    finally:
        conn.close()