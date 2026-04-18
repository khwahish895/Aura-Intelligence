export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  images: string[];
  rating: number;
  stock: number;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  wishlist: string[];
  cart: CartItem[];
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  products: {
    productId: string;
    quantity: number;
    priceAtPurchase: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'shipped' | 'delivered';
  shippingAddress: string;
  createdAt: any;
}
