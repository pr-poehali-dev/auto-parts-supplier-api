import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface Product {
  id: number;
  name: string;
  article: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

const Index = () => {
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('Курьер');
  const [paymentMethod, setPaymentMethod] = useState('Наличные');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { name: 'Двигатель', icon: 'Cog', color: 'bg-orange-500' },
    { name: 'Тормозная система', icon: 'Disc', color: 'bg-blue-500' },
    { name: 'Подвеска', icon: 'Gauge', color: 'bg-purple-500' },
    { name: 'Электрика', icon: 'Zap', color: 'bg-yellow-500' },
    { name: 'Кузов', icon: 'Box', color: 'bg-green-500' },
    { name: 'Салон', icon: 'Armchair', color: 'bg-red-500' },
  ];

  const PRODUCTS_API_URL = 'https://functions.poehali.dev/5fb23735-4379-497e-8ac7-cf1a586e328d';
  const ORDERS_API_URL = 'https://functions.poehali.dev/fa0f1871-09b4-4fb5-9467-0a65bd5f2792';

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let url = PRODUCTS_API_URL;
      if (selectedCategory) {
        url += `?category=${encodeURIComponent(selectedCategory)}`;
      }
      if (searchQuery) {
        url += selectedCategory ? '&' : '?';
        url += `search=${encodeURIComponent(searchQuery)}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncWithSuppliers = async () => {
    try {
      setSyncing(true);
      const response = await fetch(`${PRODUCTS_API_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      console.log('Синхронизация завершена:', data);
      await fetchProducts();
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const handleSearch = () => {
    fetchProducts();
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (!customerName || !customerPhone || !customerAddress) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    try {
      setSubmitting(true);
      const orderData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_address: customerAddress,
        delivery_method: deliveryMethod,
        payment_method: paymentMethod,
        items: cart.map(item => ({
          product_id: item.id,
          product_name: item.name,
          product_article: item.article,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const response = await fetch(ORDERS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error('Ошибка при оформлении заказа');

      const result = await response.json();
      
      alert(`Заказ №${result.order_id} успешно оформлен!\nМы свяжемся с вами в ближайшее время.`);
      
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setCheckoutStep('cart');
      setCartOpen(false);
    } catch (error) {
      console.error('Ошибка оформления заказа:', error);
      alert('Произошла ошибка при оформлении заказа. Попробуйте еще раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Icon name="Wrench" size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-blue-600 bg-clip-text text-transparent">
                AutoParts
              </h1>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a href="#catalog" className="text-sm font-medium hover:text-orange-600 transition-colors">Каталог</a>
              <a href="#delivery" className="text-sm font-medium hover:text-orange-600 transition-colors">Доставка</a>
              <a href="#about" className="text-sm font-medium hover:text-orange-600 transition-colors">О нас</a>
              <a href="#contacts" className="text-sm font-medium hover:text-orange-600 transition-colors">Контакты</a>
            </nav>

            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={syncWithSuppliers}
                disabled={syncing}
                className="hidden md:flex"
              >
                <Icon name={syncing ? "Loader2" : "RefreshCw"} size={16} className={syncing ? "animate-spin mr-2" : "mr-2"} />
                {syncing ? 'Синхронизация...' : 'Обновить цены'}
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Icon name="User" size={20} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => setCartOpen(!cartOpen)}
              >
                <Icon name="ShoppingCart" size={20} />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-orange-500">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div className="container mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Автозапчасти для вашего авто
            </h2>
            <p className="text-xl text-slate-600 mb-8">
              Прямые поставки от производителей. Гарантия качества. Быстрая доставка по всей России
            </p>
            
            <div className="flex gap-3 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Icon name="Search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Поиск по артикулу или названию..." 
                  className="pl-12 h-14 text-lg border-2 focus:border-orange-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button 
                size="lg" 
                className="h-14 px-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                onClick={handleSearch}
                disabled={loading}
              >
                {loading ? <Icon name="Loader2" size={20} className="animate-spin" /> : 'Найти'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="catalog" className="py-16 px-4">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold mb-8 text-center">Популярные категории</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
            {categories.map((cat, idx) => (
              <Card 
                key={idx} 
                className={`group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 animate-scale-in ${
                  selectedCategory === cat.name ? 'border-orange-500 shadow-lg' : 'hover:border-orange-500'
                }`}
                style={{ animationDelay: `${idx * 0.1}s` }}
                onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`${cat.color} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon name={cat.icon as any} size={32} className="text-white" />
                  </div>
                  <p className="font-semibold text-sm">{cat.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold">
              {selectedCategory ? `Категория: ${selectedCategory}` : 'Популярные товары'}
            </h3>
            {selectedCategory && (
              <Button variant="outline" onClick={() => setSelectedCategory(null)}>
                <Icon name="X" size={16} className="mr-2" />
                Сбросить фильтр
              </Button>
            )}
          </div>
          
          {loading ? (
            <div className="text-center py-20">
              <Icon name="Loader2" size={48} className="mx-auto animate-spin text-orange-500 mb-4" />
              <p className="text-slate-600">Загрузка товаров...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <Icon name="Package" size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600">Товары не найдены</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, idx) => (
              <Card 
                key={product.id} 
                className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-orange-500 animate-slide-up overflow-hidden"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {!product.inStock && (
                    <Badge className="absolute top-3 right-3 bg-red-500">Под заказ</Badge>
                  )}
                  {product.inStock && (
                    <Badge className="absolute top-3 right-3 bg-green-500">В наличии</Badge>
                  )}
                </div>
                <CardContent className="p-5">
                  <p className="text-xs text-slate-500 mb-1">Артикул: {product.article}</p>
                  <h4 className="font-bold text-lg mb-2 group-hover:text-orange-600 transition-colors">{product.name}</h4>
                  <Badge variant="outline" className="mb-3">{product.category}</Badge>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-orange-600">{product.price} ₽</span>
                    <Button 
                      onClick={() => addToCart(product)}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                    >
                      <Icon name="ShoppingCart" size={18} className="mr-2" />
                      В корзину
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </div>
      </section>

      <section id="delivery" className="py-16 px-4 bg-white">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold mb-12 text-center">Условия доставки</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: 'Truck', title: 'Быстрая доставка', desc: 'По Москве — в день заказа. По России — от 2 дней' },
              { icon: 'ShieldCheck', title: 'Гарантия качества', desc: 'Все товары сертифицированы. Гарантия до 2 лет' },
              { icon: 'Headphones', title: 'Поддержка 24/7', desc: 'Наши специалисты всегда готовы помочь с выбором' },
            ].map((item, idx) => (
              <Card key={idx} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon name={item.icon as any} size={32} className="text-white" />
                  </div>
                  <h4 className="font-bold text-xl mb-3">{item.title}</h4>
                  <p className="text-slate-600">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer id="contacts" className="bg-slate-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Icon name="Wrench" size={20} className="text-orange-500" />
                AutoParts
              </h4>
              <p className="text-slate-400 text-sm">Автозапчасти с доставкой по всей России</p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Каталог</h5>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-orange-500 transition-colors">Двигатель</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Тормозная система</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">Подвеска</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Информация</h5>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#delivery" className="hover:text-orange-500 transition-colors">Доставка</a></li>
                <li><a href="#" className="hover:text-orange-500 transition-colors">О нас</a></li>
                <li><a href="#contacts" className="hover:text-orange-500 transition-colors">Контакты</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Контакты</h5>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Icon name="Phone" size={16} />
                  +7 (495) 123-45-67
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="Mail" size={16} />
                  info@autoparts.ru
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
            © 2024 AutoParts. Все права защищены.
          </div>
        </div>
      </footer>

      {cartOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in" onClick={() => setCartOpen(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">Корзина</h3>
              <Button variant="ghost" size="icon" onClick={() => setCartOpen(false)}>
                <Icon name="X" size={24} />
              </Button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="ShoppingCart" size={64} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Корзина пуста</p>
              </div>
            ) : checkoutStep === 'form' ? (
              <div className="space-y-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setCheckoutStep('cart')}
                  className="mb-4"
                >
                  <Icon name="ArrowLeft" size={18} className="mr-2" />
                  Назад к корзине
                </Button>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">Имя *</label>
                  <Input 
                    placeholder="Иван Иванов"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Телефон *</label>
                  <Input 
                    placeholder="+7 (999) 123-45-67"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Email</label>
                  <Input 
                    type="email"
                    placeholder="example@mail.ru"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Адрес доставки *</label>
                  <Input 
                    placeholder="г. Москва, ул. Примерная, д. 1"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Способ доставки</label>
                  <div className="space-y-2">
                    {['Курьер', 'Самовывоз', 'Почта России'].map(method => (
                      <label key={method} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="delivery"
                          value={method}
                          checked={deliveryMethod === method}
                          onChange={(e) => setDeliveryMethod(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span>{method}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Способ оплаты</label>
                  <div className="space-y-2">
                    {['Наличные', 'Картой курьеру', 'Онлайн оплата'].map(method => (
                      <label key={method} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          value={method}
                          checked={paymentMethod === method}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span>{method}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold">Итого:</span>
                    <span className="text-2xl font-bold text-orange-600">{totalPrice.toLocaleString()} ₽</span>
                  </div>
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-lg"
                    onClick={handleCheckout}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                        Оформление...
                      </>
                    ) : (
                      'Подтвердить заказ'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map(item => (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{item.name}</h4>
                            <p className="text-xs text-slate-500 mb-2">{item.article}</p>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-orange-600">{item.price} ₽</span>
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="icon" 
                                  variant="outline" 
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.id, -1)}
                                >
                                  <Icon name="Minus" size={14} />
                                </Button>
                                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                                <Button 
                                  size="icon" 
                                  variant="outline" 
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.id, 1)}
                                >
                                  <Icon name="Plus" size={14} />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-red-500 hover:text-red-700"
                                  onClick={() => removeFromCart(item.id)}
                                >
                                  <Icon name="Trash2" size={14} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold">Итого:</span>
                    <span className="text-2xl font-bold text-orange-600">{totalPrice.toLocaleString()} ₽</span>
                  </div>
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-lg"
                    onClick={() => setCheckoutStep('form')}
                  >
                    Оформить заказ
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;