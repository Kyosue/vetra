import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useFonts } from 'expo-font';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { productService, salesService } from './services/api';

interface Product {
  _id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
}

interface CartItem extends Product {
  quantityInCart: number;
}

interface CartItemStyles {
  [key: string]: {
    backgroundColor: string;
    borderLeftWidth: number;
    borderLeftColor: string;
  };
}

const categoryStyles: CartItemStyles = {
  cartItemDefault: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9F43',
  },
  cartItemElectronics: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  cartItemClothing: {
    backgroundColor: '#F3E5F5',
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  cartItemFood: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cartItemBeauty: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  cartItemHome: {
    backgroundColor: '#FBE9E7',
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
};

interface ReceiptData {
  transactionId: string;
  date: string;
  items: CartItem[];
  totalAmount: number;
  totalItems: number;
}

export default function NewSaleScreen() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCategories, setShowCategories] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [categories, setCategories] = useState<string[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<ViewShot>(null);
  const [fontsLoaded] = useFonts({
    'Outfit-Regular': require('../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, selectedCategory, sortBy, sortOrder]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getProducts();
      setProducts(data);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(data.map(p => p.category)));
      setCategories(['all', ...uniqueCategories]);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      if (error.message === 'AUTH_REQUIRED') {
        Alert.alert('Session Expired', 'Please login again to continue.', [
          {
            text: 'OK',
            onPress: () => router.replace('/')
          }
        ]);
      } else {
        Alert.alert('Error', 'Failed to fetch products');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return sortOrder === 'asc' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case 'price':
          return sortOrder === 'asc'
            ? a.price - b.price
            : b.price - a.price;
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item._id === product._id);
      
      if (existingItemIndex !== -1) {
        // Update existing item quantity
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantityInCart: newCart[existingItemIndex].quantityInCart + 1
        };
        return newCart;
      } else {
        // Add new item to cart
        return [...prevCart, {
          ...product,
          quantityInCart: 1
        }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item._id === productId);
      
      if (existingItemIndex === -1) return prevCart;

      const existingItem = prevCart[existingItemIndex];
      
      if (existingItem.quantityInCart > 1) {
        // Decrease quantity if more than 1
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...existingItem,
          quantityInCart: existingItem.quantityInCart - 1
        };
        return newCart;
      } else {
        // Remove item if quantity is 1
        return prevCart.filter(item => item._id !== productId);
      }
    });
  };

  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item._id === productId);
      
      if (existingItemIndex === -1) return prevCart;

      const existingItem = prevCart[existingItemIndex];
      
      // Validate new quantity
      if (newQuantity <= 0) {
        return prevCart.filter(item => item._id !== productId);
      }

      const newCart = [...prevCart];
      newCart[existingItemIndex] = {
        ...existingItem,
        quantityInCart: newQuantity
      };
      return newCart;
    });
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantityInCart), 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Your cart is empty', [{ text: 'OK' }]);
      return;
    }
    setShowCheckoutModal(true);
  };

  const processCheckout = async () => {
    try {
      setLoading(true);
      const items = cart.map(item => ({
        productId: item._id,
        quantity: item.quantityInCart,
        price: item.price
      }));

      const sale = await salesService.createSale(items, calculateTotal());

      // Set receipt data
      setReceiptData({
        transactionId: sale._id,
        date: new Date().toISOString(),
        items: cart,
        totalAmount: calculateTotal(),
        totalItems: getTotalItems()
      });

      setCart([]);
      setShowCheckoutModal(false);
      setShowReceiptModal(true); // Show receipt modal instead of alert
    } catch (error: any) {
      console.error('Error creating sale:', error);
      Alert.alert('Error', error.message || 'Failed to complete sale', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const generateReceipt = async () => {
    if (!receiptRef.current || !receiptData) return;

    try {
      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
      });
      
      // Save to device's gallery
      const timestamp = new Date().getTime();
      const fileName = `receipt_${timestamp}.png`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri
      });

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(fileUri);
      
      Alert.alert('Success', 'Receipt saved to gallery');
    } catch (error) {
      console.error('Error generating receipt:', error);
      Alert.alert('Error', 'Failed to save receipt');
    }
  };

  const shareReceipt = async () => {
    if (!receiptRef.current || !receiptData) return;

    try {
      const uri = await captureRef(receiptRef, {
        format: 'png',
        quality: 1,
      });
      
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share Receipt',
        UTI: 'image/png'
      });
    } catch (error) {
      console.error('Error sharing receipt:', error);
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantityInCart, 0);
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF9F43" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Sale</Text>
        <TouchableOpacity 
          style={styles.cartButton}
          onPress={() => setShowCart(true)}
        >
          <Ionicons name="cart-outline" size={24} color="#fff" />
          {getTotalItems() > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowCategories(!showCategories)}
          >
            <Ionicons name="filter" size={20} color="#FF9F43" />
            <Text style={styles.filterButtonText}>Category</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={toggleSortOrder}
          >
            <Ionicons 
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
              size={20} 
              color="#FF9F43" 
            />
            <Text style={styles.filterButtonText}>
              {sortBy === 'name' ? 'Name' : sortBy === 'price' ? 'Price' : 'Stock'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Modal */}
      <Modal
        visible={showCategories}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategories(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView>
              {categories.map((category, index) => (
                <TouchableOpacity
                  key={`category-${index}`}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category && styles.selectedCategory
                  ]}
                  onPress={() => {
                    setSelectedCategory(category);
                    setShowCategories(false);
                  }}
                >
                  <Text style={styles.categoryText}>
                    {category === 'all' ? 'All Categories' : category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCategories(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Main Content */}
      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#FF9F43" style={styles.loader} />
        ) : (
          <>
            {/* Products Grid */}
            <View style={styles.productsGrid}>
              {filteredProducts.map((product, index) => (
                <View key={`product-${product._id}-${index}`} style={styles.productCard}>
                  {product.imageUrl ? (
                    <Image 
                      source={{ uri: product.imageUrl }} 
                      style={styles.productImage}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="image-outline" size={40} color="#999" />
                    </View>
                  )}
                  <View style={styles.productDetails}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>₱{product.price.toFixed(2)}</Text>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => addToCart(product)}
                    >
                      <Ionicons name="add-circle" size={32} color="#FF9F43" />
                      <Text style={styles.addButtonText}>Add to Cart</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Cart Modal */}
      <Modal
        visible={showCart}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCart(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setShowCart(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Shopping Cart</Text>
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={48} color="#999" />
                <Text style={styles.emptyCartText}>Your cart is empty</Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.cartItems}>
                  {cart.map((item, index) => {
                    const categoryStyle = categoryStyles[`cartItem${item.category.replace(/\s+/g, '')}`] || categoryStyles.cartItemDefault;
                    return (
                      <View key={`${item._id}-${index}`} style={[styles.cartItem, categoryStyle]}>
                        <View style={styles.cartItemImageContainer}>
                          {item.imageUrl ? (
                            <Image 
                              source={{ uri: item.imageUrl }} 
                              style={styles.cartItemImage}
                            />
                          ) : (
                            <View style={styles.cartImagePlaceholder}>
                              <Ionicons name="image-outline" size={24} color="#999" />
                            </View>
                          )}
                        </View>
                        <View style={styles.cartItemDetails}>
                          <Text style={styles.cartItemName}>{item.name}</Text>
                          <View style={styles.priceContainer}>
                            <Text style={styles.cartItemPrice}>₱{item.price.toFixed(2)}</Text>
                            <Text style={styles.cartItemCategory}>{item.category}</Text>
                          </View>
                        </View>
                        <View style={styles.cartItemQuantity}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => removeFromCart(item._id)}
                          >
                            <Ionicons name="remove-circle-outline" size={24} color="#FF3B30" />
                          </TouchableOpacity>
                          <View style={styles.quantityDisplay}>
                            <TextInput
                              style={styles.quantityInput}
                              value={item.quantityInCart.toString()}
                              keyboardType="numeric"
                              onChangeText={(text) => {
                                const newQuantity = parseInt(text) || 0;
                                updateCartItemQuantity(item._id, newQuantity);
                              }}
                            />
                          </View>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => addToCart(item)}
                          >
                            <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                <View style={styles.cartFooter}>
                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total Items:</Text>
                    <Text style={styles.totalItems}>{getTotalItems()}</Text>
                  </View>
                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalAmount}>₱{calculateTotal().toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.checkoutButton}
                    onPress={handleCheckout}
                  >
                    <Text style={styles.checkoutButtonText}>Checkout</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Checkout Confirmation Modal */}
      <Modal
        visible={showCheckoutModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setShowCheckoutModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Checkout</Text>
            </View>

            <View style={styles.checkoutContent}>
              <View style={styles.checkoutSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Items:</Text>
                  <Text style={styles.summaryValue}>{getTotalItems()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Amount:</Text>
                  <Text style={styles.summaryAmount}>₱{calculateTotal().toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.checkoutActions}>
                <TouchableOpacity 
                  style={[styles.checkoutButton, styles.cancelButton]}
                  onPress={() => setShowCheckoutModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.checkoutButton, styles.confirmButton]}
                  onPress={processCheckout}
                >
                  <Text style={styles.confirmButtonText}>Confirm Checkout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        visible={showReceiptModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReceiptModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setShowReceiptModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receipt</Text>
            </View>

            <ScrollView style={styles.receiptContent}>
              <ViewShot ref={receiptRef} style={styles.receiptContainer}>
                <View style={styles.receiptHeader}>
                  <Image 
                    source={require('../assets/images/vetra.png')}
                    style={styles.receiptLogo}
                  />
                  <Text style={styles.receiptTitle}>Vetra</Text>
                  <Text style={styles.receiptSubtitle}>Sales Receipt</Text>
                  <Text style={styles.receiptInfo}>
                    Transaction ID: {receiptData?.transactionId}
                  </Text>
                  <Text style={styles.receiptInfo}>
                    Date: {receiptData?.date ? new Date(receiptData.date).toLocaleString() : ''}
                  </Text>
                </View>

                <View style={styles.receiptItems}>
                  {receiptData?.items.map((item, index) => (
                    <View key={index} style={styles.receiptItem}>
                      <View style={styles.receiptItemInfo}>
                        <Text style={styles.receiptItemName}>{item.name}</Text>
                        <Text style={styles.receiptItemQuantity}>
                          {item.quantityInCart} x ₱{item.price.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.receiptItemTotal}>
                        ₱{(item.price * item.quantityInCart).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.receiptFooter}>
                  <View style={styles.receiptTotal}>
                    <Text style={styles.receiptTotalLabel}>Total Items:</Text>
                    <Text style={styles.receiptTotalValue}>{receiptData?.totalItems}</Text>
                  </View>
                  <View style={styles.receiptTotal}>
                    <Text style={styles.receiptTotalLabel}>Total Amount:</Text>
                    <Text style={styles.receiptTotalAmount}>
                      ₱{receiptData?.totalAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.receiptThankYou}>
                  <Text style={styles.thankYouText}>Thank you for your purchase!</Text>
                </View>
              </ViewShot>
            </ScrollView>

            <View style={styles.receiptActions}>
              <View style={styles.receiptPrimaryActions}>
                <TouchableOpacity 
                  style={[styles.receiptButton, styles.downloadButton]}
                  onPress={generateReceipt}
                >
                  <Ionicons name="download-outline" size={24} color="#fff" />
                  <Text style={styles.receiptButtonText}>Save to Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.receiptButton, styles.shareButton]}
                  onPress={shareReceipt}
                >
                  <Ionicons name="share-outline" size={24} color="#fff" />
                  <Text style={styles.receiptButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF9F43',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: '#fff',
  },
  cartButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#2C3E50',
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#2C3E50',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  productName: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#FFF5EB',
    borderRadius: 8,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#FF9F43',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  closeButton: {
    padding: 8,
  },
  categoryItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedCategory: {
    backgroundColor: '#FFF5E6',
  },
  categoryText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#2C3E50',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  emptyCart: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyCartText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    marginTop: 16,
  },
  cartItems: {
    maxHeight: '60%',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cartItemImageContainer: {
    width: 70,
    height: 70,
    marginRight: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cartItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cartImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#4CAF50',
    marginRight: 8,
  },
  cartItemCategory: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cartItemQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    padding: 4,
  },
  quantityDisplay: {
    minWidth: 30,
    height: 30,
    backgroundColor: '#fff',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quantityInput: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    textAlign: 'center',
    minWidth: 30,
    padding: 0,
  },
  cartFooter: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  totalItems: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#4CAF50',
  },
  checkoutButton: {
    backgroundColor: '#FF9F43',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  checkoutContent: {
    padding: 20,
  },
  checkoutSummary: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
  },
  summaryAmount: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: '#4CAF50',
  },
  checkoutActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#FF9F43',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  receiptContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 20,
  },
  receiptLogo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  receiptSubtitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    marginBottom: 12,
  },
  receiptInfo: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    marginBottom: 4,
  },
  receiptItems: {
    marginBottom: 20,
  },
  receiptItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receiptItemInfo: {
    flex: 1,
  },
  receiptItemName: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  receiptItemQuantity: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  receiptItemTotal: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
  },
  receiptFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
    marginBottom: 20,
  },
  receiptTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptTotalLabel: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  receiptTotalValue: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
  },
  receiptTotalAmount: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#4CAF50',
  },
  receiptThankYou: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  thankYouText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
  },
  receiptActions: {
    marginTop: 20,
  },
  receiptPrimaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  receiptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  downloadButton: {
    backgroundColor: '#4CAF50',
    flex: 2,
  },
  shareButton: {
    backgroundColor: '#2196F3',
    flex: 1,
  },
  receiptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  receiptContent: {
    maxHeight: '70%',
  },
}); 