import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera } from 'expo-camera';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { productService } from './services/api';

// Get screen dimensions for responsive layout
const { width } = Dimensions.get('window');

interface Product {
  _id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
}

export default function InventoryScreen() {
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
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    category: '',
    imageUrl: ''
  });
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    price: '',
    category: ''
  });
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [fontsLoaded] = useFonts({
    'Outfit-Regular': require('../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
  });

  const checkCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  useEffect(() => {
    checkAuth();
    checkCameraPermission();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, selectedCategory, sortBy, sortOrder]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }
      fetchProducts();
    } catch (error: any) {
      console.error('Auth check error:', error);
      router.replace('/');
    }
  };

  const handleAuthError = () => {
    Alert.alert('Session Expired', 'Please login again to continue.', [
      {
        text: 'OK',
        onPress: () => router.replace('/')
      }
    ]);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getProducts();
      setProducts(data);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      if (error.message === 'AUTH_REQUIRED') {
        handleAuthError();
      } else {
        Alert.alert('Error', 'Failed to fetch products');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setNewProduct({ ...newProduct, imageUrl: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setNewProduct({ ...newProduct, imageUrl: result.assets[0].uri });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const validateForm = () => {
    const errors = {
      name: '',
      price: '',
      category: ''
    };

    if (!newProduct.name.trim()) {
      errors.name = 'Product name is required';
    }

    if (!newProduct.price.trim()) {
      errors.price = 'Price is required';
    } else if (isNaN(parseFloat(newProduct.price)) || parseFloat(newProduct.price) <= 0) {
      errors.price = 'Please enter a valid price';
    }

    if (!newProduct.category.trim()) {
      errors.category = 'Category is required';
    }

    setValidationErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleAddProduct = async () => {
    if (!validateForm()) return;

    Alert.alert(
      'Add Product',
      'Are you sure you want to add this product?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Add',
          onPress: async () => {
            try {
              await productService.createProduct({
                name: newProduct.name,
                price: parseFloat(newProduct.price),
                category: newProduct.category,
                imageUrl: newProduct.imageUrl || undefined,
              });

              setNewProduct({ name: '', price: '', category: '', imageUrl: '' });
              setShowAddProduct(false);
              setValidationErrors({ name: '', price: '', category: '' });
              fetchProducts();
            } catch (error: any) {
              console.error('Error adding product:', error);
              if (error.message === 'AUTH_REQUIRED') {
                handleAuthError();
              } else {
                Alert.alert('Error', 'Failed to add product');
              }
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  const openEditModal = (product: Product) => {
    console.log('Opening edit modal for product:', product); // Debug log
    
    // Check if product exists and has required fields
    if (!product) {
      Alert.alert('Error', 'No product selected');
      return;
    }

    // Set the editing product
    setEditingProduct(product);
    
    // Set the form data with fallback values
    setNewProduct({
      name: product.name || '',
      price: (product.price || 0).toString(),
      category: product.category || '',
      imageUrl: product.imageUrl || ''
    });
  };

  const handleEditProduct = async () => {
    if (!editingProduct) {
      Alert.alert('Error', 'No product selected for editing');
      return;
    }

    // Debug log to check the product data
    console.log('Editing product data:', {
      _id: editingProduct._id,
      fullProduct: editingProduct
    });

    if (!validateForm()) return;

    Alert.alert(
      'Save Changes',
      'Are you sure you want to save these changes?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Save',
          onPress: async () => {
            try {
              console.log('Updating product with ID:', editingProduct._id);
              await productService.updateProduct(editingProduct._id, {
                name: newProduct.name,
                price: parseFloat(newProduct.price),
                category: newProduct.category,
                imageUrl: newProduct.imageUrl || undefined,
              });

              setEditingProduct(null);
              setNewProduct({ name: '', price: '', category: '', imageUrl: '' });
              setValidationErrors({ name: '', price: '', category: '' });
              fetchProducts();
            } catch (error: any) {
              console.error('Error updating product:', error);
              if (error.message === 'AUTH_REQUIRED') {
                handleAuthError();
              } else {
                Alert.alert('Error', error.message || 'Failed to update product');
              }
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  const closeEditModal = () => {
    setEditingProduct(null);
    setNewProduct({ name: '', price: '', category: '', imageUrl: '' });
    setValidationErrors({ name: '', price: '', category: '' });
  };

  const handleDeleteProduct = async (id: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {}
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.deleteProduct(id);
              fetchProducts();
            } catch (error: any) {
              console.error('Error deleting product:', error);
              if (error.message === 'AUTH_REQUIRED') {
                handleAuthError();
              } else {
                Alert.alert('Error', error.message || 'Failed to delete product');
              }
            }
          }
        }
      ],
      { cancelable: true }
    );
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
    setSortOrder(prevSortOrder => prevSortOrder === 'asc' ? 'desc' : 'asc');
  };

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
        <Text style={styles.headerTitle}>Inventory</Text>
        <TouchableOpacity 
          onPress={() => setShowAddProduct(!showAddProduct)} 
          style={styles.addButton}
        >
          <Ionicons name={showAddProduct ? "close" : "add"} size={24} color="#FF9F43" />
        </TouchableOpacity>
      </View>

      {/* Filter and Search Bar */}
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
            style={styles.filterButton}
            onPress={() => {
              setSortBy('name');
              toggleSortOrder();
            }}
          >
            <Ionicons 
              name="text" 
              size={20} 
              color="#FF9F43" 
            />
            <Text style={styles.filterButtonText}>Name</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => {
              setSortBy('price');
              toggleSortOrder();
            }}
          >
            <Ionicons 
              name="cash-outline" 
              size={20} 
              color="#FF9F43" 
            />
            <Text style={styles.filterButtonText}>Price</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => toggleSortOrder()}
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

      {/* Main Content */}
      {(showAddProduct || editingProduct) ? (
        // Add/Edit Product Form in ScrollView
        <View style={{ flex: 1 }}>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.addProductContainer}>
              <Text style={styles.sectionTitle}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
              
              {/* Image Section */}
              <View style={styles.imageSection}>
                {newProduct.imageUrl ? (
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: newProduct.imageUrl }} style={styles.productImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => setNewProduct({...newProduct, imageUrl: ''})}
                    >
                      <Ionicons name="close-circle" size={26} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={40} color="#ddd" />
                    <Text style={styles.imagePlaceholderText}>Add Product Image</Text>
                  </View>
                )}
                <View style={styles.imageButtons}>
                  <TouchableOpacity 
                    style={styles.imageButton} 
                    onPress={pickImage}
                  >
                    <Ionicons name="images-outline" size={20} color="#FF9F43" />
                    <Text style={styles.imageButtonText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.imageButton} 
                    onPress={takePhoto}
                  >
                    <Ionicons name="camera-outline" size={20} color="#FF9F43" />
                    <Text style={styles.imageButtonText}>Camera</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Product Name</Text>
                <TextInput
                  style={[styles.input, validationErrors.name ? styles.inputError : null]}
                  placeholder="Enter product name"
                  value={newProduct.name}
                  onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
                  placeholderTextColor="#999"
                />
                {validationErrors.name ? (
                  <Text style={styles.errorText}>{validationErrors.name}</Text>
                ) : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Price</Text>
                <TextInput
                  style={[styles.input, validationErrors.price ? styles.inputError : null]}
                  placeholder="Enter price"
                  value={newProduct.price}
                  onChangeText={(text) => setNewProduct({ ...newProduct, price: text })}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
                {validationErrors.price ? (
                  <Text style={styles.errorText}>{validationErrors.price}</Text>
                ) : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Category</Text>
                <TextInput
                  style={[styles.input, validationErrors.category ? styles.inputError : null]}
                  placeholder="Enter category"
                  value={newProduct.category}
                  onChangeText={(text) => setNewProduct({ ...newProduct, category: text })}
                  placeholderTextColor="#999"
                />
                {validationErrors.category ? (
                  <Text style={styles.errorText}>{validationErrors.category}</Text>
                ) : null}
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={editingProduct ? closeEditModal : () => setShowAddProduct(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={editingProduct ? handleEditProduct : handleAddProduct}
                >
                  <Text style={styles.saveButtonText}>{editingProduct ? 'Save Changes' : 'Add Product'}</Text>
                </TouchableOpacity>
              </View>
              
              {/* Add some padding at the bottom for better scrolling */}
              <View style={{ height: 30 }}/>
            </View>
          </ScrollView>
        </View>
      ) : (
        // Product List
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#FF9F43" style={styles.loader} />
              <Text style={styles.loaderText}>Loading products...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Ionicons name="cube-outline" size={64} color="#ddd" />
              <Text style={styles.emptyProductsText}>
                No products found{'\n'}
                {searchQuery ? `for "${searchQuery}"` : ''}
              </Text>
              <TouchableOpacity 
                style={styles.addFirstButton}
                onPress={() => setShowAddProduct(true)}
              >
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
                <Text style={styles.addFirstButtonText}>Add Your First Product</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredProducts.map((product, index) => (
              <View key={`product-${product._id}-${index}`} style={styles.productCard}>
                <View style={styles.productMain}>
                  <View style={styles.productImageWrapper}>
                    {product.imageUrl ? (
                      <Image 
                        source={{ uri: product.imageUrl }} 
                        style={styles.productListImage} 
                      />
                    ) : (
                      <View style={styles.productListImagePlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#ddd" />
                      </View>
                    )}
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <View style={styles.categoryPill}>
                      <Text style={styles.productCategory}>{product.category}</Text>
                    </View>
                    <Text style={styles.productPrice}>₱{formatCurrency(product.price)}</Text>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(product)}
                  >
                    <Ionicons name="create-outline" size={20} color="#2196F3" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteProduct(product._id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  addButton: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    padding: 8,
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
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginLeft: 8,
  },
  addProductContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 20,
  },
  formScrollView: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: 150,
    height: 150,
    borderRadius: 16,
    marginBottom: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 18,
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFF5E6',
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#FF9F43',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 50,
    fontSize: 16,
    fontFamily: 'Outfit-Regular',
    color: '#2C3E50',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    marginTop: 4,
    marginLeft: 4,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#FF9F43',
  },
  cancelButtonText: {
    color: '#2C3E50',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
    overflow: 'hidden',
  },
  productListImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  productListImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  productInfo: {
    flex: 1,
    marginRight: 8,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 159, 67, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  productCategory: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    color: '#FF9F43',
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#4CAF50',
    marginTop: 4,
  },
  productActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
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
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  addFirstButton: {
    backgroundColor: '#FF9F43',
    padding: 16,
    borderRadius: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    marginLeft: 8,
  }
}); 