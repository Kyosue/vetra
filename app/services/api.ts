import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    businessName: string;
  };
  message?: string;
}

interface UserProfile {
  fullName: string;
  username: string;
  businessName: string;
  businessType: string;
  contactNumber: string;
}

interface ProductResponse {
  _id: string;
  id?: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
}

interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
}

interface Sale {
  _id: string;
  items: SaleItem[];
  totalAmount: number;
  date: string;
}

// Use environment variable for API URL, fallback to development URL
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.247:3000/api';

// Navigation utility
const handleAuthError = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
  // Instead of using router directly, we'll throw a specific error
  throw new Error('AUTH_REQUIRED');
};

const getHeaders = async (includeAuth = true) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (includeAuth) {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error response:', errorText);
    try {
      const error = JSON.parse(errorText);
      if (response.status === 401) {
        await handleAuthError();
      }
      throw new Error(error.message || 'Something went wrong');
    } catch (e) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }
  }
  return response.json();
};

export const authService = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: await getHeaders(false), // Don't include auth token for login
        body: JSON.stringify({ username, password }),
      });

      const data = await handleResponse<AuthResponse>(response);
      
      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (userData: {
    fullName: string;
    username: string;
    password: string;
    businessName: string;
    businessType: string;
    contactNumber: string;
  }): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: await getHeaders(false), // Don't include auth token for registration
        body: JSON.stringify(userData),
      });

      const data = await handleResponse<AuthResponse>(response);
      
      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },
};

export const userService = {
  getProfile: async (): Promise<UserProfile> => {
    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'GET',
        headers: await getHeaders(),
      });

      return handleResponse<UserProfile>(response);
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  updateProfile: async (profileData: {
    fullName?: string;
    businessName?: string;
    businessType?: string;
    contactNumber?: string;
  }): Promise<UserProfile> => {
    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: await getHeaders(),
        body: JSON.stringify(profileData),
      });

      return handleResponse<UserProfile>(response);
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },
};

export const productService = {
  getProducts: async () => {
    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'GET',
        headers: await getHeaders()
      });
      const data = await handleResponse<ProductResponse[]>(response);
      // Transform the data to ensure _id is used instead of id
      return data.map((product) => ({
        _id: product._id || product.id || '',  // Use _id from MongoDB, fallback to id if needed
        name: product.name,
        price: product.price,
        category: product.category,
        imageUrl: product.imageUrl
      }));
    } catch (error) {
      console.error('Error in getProducts:', error);
      throw error;
    }
  },

  createProduct: async (productData: {
    name: string;
    price: number;
    category: string;
    imageUrl?: string;
  }): Promise<ProductResponse> => {
    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify(productData),
      });

      return handleResponse<ProductResponse>(response);
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  updateProduct: async (id: string, productData: {
    name?: string;
    price?: number;
    category?: string;
    imageUrl?: string;
  }): Promise<ProductResponse> => {
    if (!id) {
      throw new Error('Product ID is required for update');
    }

    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'PUT',
        headers: await getHeaders(),
        body: JSON.stringify(productData),
      });

      return handleResponse<ProductResponse>(response);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  deleteProduct: async (id: string): Promise<void> => {
    if (!id) {
      throw new Error('Product ID is required for deletion');
    }

    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: await getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Something went wrong');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  },
};

export const salesService = {
  createSale: async (items: SaleItem[], totalAmount: number): Promise<Sale> => {
    try {
      const response = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ items, totalAmount }),
      });

      return handleResponse<Sale>(response);
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  },

  getSales: async (): Promise<Sale[]> => {
    try {
      const response = await fetch(`${API_URL}/sales`, {
        method: 'GET',
        headers: await getHeaders(),
      });

      return handleResponse<Sale[]>(response);
    } catch (error) {
      console.error('Error fetching sales:', error);
      throw error;
    }
  },
};

// Update default export
export default {
  authService,
  userService,
  productService,
  salesService
}; 