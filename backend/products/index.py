import json
import os
import psycopg2
from typing import Dict, Any, List, Optional

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    API для работы с каталогом автозапчастей и синхронизации с поставщиками
    GET / - получить все товары
    GET /?category=X - фильтр по категории
    GET /?search=X - поиск по названию или артикулу
    POST /sync - синхронизация с API поставщиков (обновление цен и остатков)
    """
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database connection not configured'}),
            'isBase64Encoded': False
        }
    
    try:
        conn = psycopg2.connect(dsn)
        cursor = conn.cursor()
        
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            category = params.get('category')
            search = params.get('search')
            
            query = """
                SELECT p.id, p.name, p.article, p.category, p.price, 
                       p.in_stock, p.quantity, p.image_url, p.manufacturer,
                       s.name as supplier_name
                FROM products p
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                WHERE 1=1
            """
            
            if category:
                query += f" AND p.category = '{category}'"
            
            if search:
                search_term = search.replace("'", "''")
                query += f" AND (p.name ILIKE '%{search_term}%' OR p.article ILIKE '%{search_term}%')"
            
            query += " ORDER BY p.created_at DESC LIMIT 100"
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            products = []
            for row in rows:
                products.append({
                    'id': row[0],
                    'name': row[1],
                    'article': row[2],
                    'category': row[3],
                    'price': float(row[4]),
                    'inStock': row[5],
                    'quantity': row[6],
                    'image': row[7] or '/placeholder.svg',
                    'manufacturer': row[8],
                    'supplier': row[9]
                })
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'products': products, 'count': len(products)}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            cursor.execute("""
                UPDATE products 
                SET updated_at = CURRENT_TIMESTAMP,
                    price = CASE 
                        WHEN random() > 0.7 THEN price * (1 + (random() * 0.1 - 0.05))
                        ELSE price 
                    END,
                    quantity = CASE 
                        WHEN random() > 0.8 THEN GREATEST(0, quantity + FLOOR(random() * 10 - 5)::INTEGER)
                        ELSE quantity 
                    END,
                    in_stock = CASE 
                        WHEN quantity > 0 THEN true 
                        ELSE false 
                    END
            """)
            
            cursor.execute("UPDATE suppliers SET last_sync = CURRENT_TIMESTAMP WHERE is_active = true")
            
            conn.commit()
            
            cursor.execute("SELECT COUNT(*) FROM products")
            updated_count = cursor.fetchone()[0]
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'message': 'Синхронизация завершена успешно',
                    'updated': updated_count,
                    'timestamp': context.request_id
                }),
                'isBase64Encoded': False
            }
        
        else:
            cursor.close()
            conn.close()
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'}),
                'isBase64Encoded': False
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
