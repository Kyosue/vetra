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
  Dimensions,
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

// Get screen dimensions for responsive layout
const { width } = Dimensions.get('window');

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
  // Format currency with thousands separators
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

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

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantityInCart, 0);
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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF9F43" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
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
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={[
              styles.filterButton,
              selectedCategory !== 'all' && styles.activeFilterButton
            ]}
            onPress={() => setShowCategories(!showCategories)}
          >
            <Ionicons 
              name="filter" 
              size={20} 
              color={selectedCategory !== 'all' ? "#fff" : "#FF9F43"} 
            />
            <Text 
              style={[
                styles.filterButtonText,
                selectedCategory !== 'all' && styles.activeFilterText
              ]}
            >
              {selectedCategory === 'all' ? 'Category' : selectedCategory}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => {
              // Toggle between name and price if already selected
              if (sortBy === 'name') {
                setSortBy('price');
              } else {
                setSortBy('name');
                toggleSortOrder();
              }
            }}
          >
            <Ionicons 
              name={sortBy === 'name' ? 'text' : 'cash-outline'} 
              size={20} 
              color="#FF9F43" 
            />
            <Text style={styles.filterButtonText}>
              {sortBy === 'name' ? 'Name' : 'Price'}
            </Text>
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
              {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
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
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCategories(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCategories(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.categoryList}>
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
                  <View style={[
                    styles.categoryIcon,
                    selectedCategory === category && styles.selectedCategoryIcon
                  ]}>
                    <Ionicons 
                      name={category === 'all' ? 'apps' : 'list'} 
                      size={20} 
                      color={selectedCategory === category ? '#fff' : '#FF9F43'} 
                    />
                  </View>
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category && styles.selectedCategoryText
                  ]}>
                    {category === 'all' ? 'All Categories' : category}
                  </Text>
                  {selectedCategory === category && (
                    <Ionicons name="checkmark" size={20} color="#FF9F43" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#FF9F43" style={styles.loader} />
            <Text style={styles.loaderText}>Loading products...</Text>
          </View>
        ) : (
          <>
            {filteredProducts.length === 0 ? (
              <View style={styles.emptyProducts}>
                <Ionicons name="search" size={48} color="#ddd" />
                <Text style={styles.emptyProductsText}>
                  No products found{'\n'}
                  {searchQuery ? `for "${searchQuery}"` : ''}
                </Text>
              </View>
            ) : (
              <View style={styles.productsGrid}>
                {filteredProducts.map((product, index) => (
                  <TouchableOpacity 
                    key={`product-${product._id}-${index}`} 
                    style={styles.productCard}
                    onPress={() => addToCart(product)}
                  >
                    <View style={styles.productImageContainer}>
                      {product.imageUrl ? (
                        <Image 
                          source={{ uri: product.imageUrl }} 
                          style={styles.productImage}
                        />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <Ionicons name="image-outline" size={32} color="#ddd" />
                        </View>
                      )}
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{product.category}</Text>
                      </View>
                    </View>
                    <View style={styles.productDetails}>
                      <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                      <View style={styles.productBottom}>
                        <Text style={styles.productPrice}>₱{formatCurrency(product.price)}</Text>
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => addToCart(product)}
                        >
                          <Ionicons name="add-circle" size={28} color="#FF9F43" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
          <View style={styles.cartModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Shopping Cart
                {cart.length > 0 && <Text style={styles.cartItemCount}> ({getTotalItems()})</Text>}
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCart(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="cart-outline" size={64} color="#ddd" />
                <Text style={styles.emptyCartText}>Your cart is empty</Text>
                <TouchableOpacity 
                  style={styles.browseButton}
                  onPress={() => setShowCart(false)}
                >
                  <Text style={styles.browseButtonText}>Browse Products</Text>
                </TouchableOpacity>
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
                            <Text style={styles.cartItemPrice}>₱{formatCurrency(item.price)}</Text>
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
                    <Text style={styles.totalAmount}>₱{formatCurrency(calculateTotal())}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.checkoutButton}
                    onPress={handleCheckout}
                  >
                    <Ionicons name="cart-outline" size={20} color="#fff" style={styles.checkoutIcon} />
                    <Text style={styles.checkoutButtonText}>Checkout</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
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
          <View style={styles.checkoutModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Checkout</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCheckoutModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.checkoutContent}>
              <View style={styles.checkoutSummary}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                <View style={styles.cartMiniItems}>
                  {cart.map((item, index) => (
                    <View key={index} style={styles.cartMiniItem}>
                      <Text style={styles.cartMiniName} numberOfLines={1}>
                        {item.name} x {item.quantityInCart}
                      </Text>
                      <Text style={styles.cartMiniPrice}>
                        ₱{formatCurrency(item.price * item.quantityInCart)}
                      </Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Items:</Text>
                  <Text style={styles.summaryValue}>{getTotalItems()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Amount:</Text>
                  <Text style={styles.summaryAmount}>₱{formatCurrency(calculateTotal())}</Text>
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
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.checkoutIcon} />
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
          <View style={styles.receiptModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receipt</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowReceiptModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
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
                          {item.quantityInCart} x ₱{formatCurrency(item.price)}
                        </Text>
                      </View>
                      <Text style={styles.receiptItemTotal}>
                        ₱{formatCurrency(item.price * item.quantityInCart)}
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
                      ₱{receiptData?.totalAmount ? formatCurrency(receiptData.totalAmount) : '0.00'}
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
                  <Ionicons name="download-outline" size={22} color="#fff" />
                  <Text style={styles.receiptButtonText}>Save to Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.receiptButton, styles.shareButton]}
                  onPress={shareReceipt}
                >
                  <Ionicons name="share-outline" size={22} color="#fff" />
                  <Text style={styles.receiptButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: '#fff',
  },
  cartButton: {
    padding: 10,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#2C3E50',
  },
  clearButton: {
    padding: 6,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  activeFilterButton: {
    backgroundColor: '#FF9F43',
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginLeft: 8,
  },
  activeFilterText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loader: {
    marginBottom: 16,
  },
  loaderText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  emptyProducts: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyProductsText: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  productName: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  productBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#4CAF50',
  },
  addButton: {
    padding: 6,
  },
  categoryBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 159, 67, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
  },
  modalCloseButton: {
    padding: 8,
  },
  categoryList: {
    maxHeight: '70%',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedCategory: {
    backgroundColor: '#FFF5E6',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 16,
    backgroundColor: '#FFF5E6',
  },
  selectedCategoryIcon: {
    backgroundColor: '#FF9F43',
  },
  categoryText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#2C3E50',
  },
  selectedCategoryText: {
    fontFamily: 'Outfit-Bold',
  },
  cartModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  checkoutModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  receiptModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  cartItemCount: {
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#666',
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
  browseButton: {
    backgroundColor: '#FF9F43',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
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
    width: 60,
    height: 60,
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
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: '#4CAF50',
  },
  checkoutButton: {
    backgroundColor: '#FF9F43',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  checkoutContent: {
    padding: 16,
  },
  checkoutSummary: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  cartMiniItems: {
    marginBottom: 12,
  },
  cartMiniItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cartMiniName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#2C3E50',
  },
  cartMiniPrice: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#4CAF50',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
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
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    flex: 2,
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
  checkoutIcon: {
    marginRight: 8,
  },
  receiptContent: {
    maxHeight: '70%',
  },
  receiptContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
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
    color: '#4CAF50',
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
  }
}); 