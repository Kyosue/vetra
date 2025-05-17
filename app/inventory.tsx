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

interface Product {
  _id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
}

export default function InventoryScreen() {
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF9F43" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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

      {/* Search Bar */}
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

      {/* Add/Edit Product Form */}
      {(showAddProduct || editingProduct) && (
        <View style={styles.addProductContainer}>
          <Text style={styles.sectionTitle}>
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </Text>
          
          {/* Image Section */}
          <View style={styles.imageSection}>
            {newProduct.imageUrl ? (
              <Image source={{ uri: newProduct.imageUrl }} style={styles.productImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={40} color="#999" />
                <Text style={styles.imagePlaceholderText}>Add Product Image</Text>
              </View>
            )}
            <View style={styles.imageButtons}>
              <TouchableOpacity 
                key="gallery-button" 
                style={styles.imageButton} 
                onPress={pickImage}
              >
                <Ionicons name="images-outline" size={20} color="#FF9F43" />
                <Text style={styles.imageButtonText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                key="camera-button" 
                style={styles.imageButton} 
                onPress={takePhoto}
              >
                <Ionicons name="camera-outline" size={20} color="#FF9F43" />
                <Text style={styles.imageButtonText}>Camera</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, validationErrors.name ? styles.inputError : null]}
              placeholder="Product Name"
              value={newProduct.name}
              onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
              placeholderTextColor="#999"
            />
            {validationErrors.name ? (
              <Text style={styles.errorText}>{validationErrors.name}</Text>
            ) : null}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, validationErrors.price ? styles.inputError : null]}
              placeholder="Price"
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
            <TextInput
              style={[styles.input, validationErrors.category ? styles.inputError : null]}
              placeholder="Category"
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
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={editingProduct ? handleEditProduct : handleAddProduct}
            >
              <Text style={styles.buttonText}>{editingProduct ? 'Save' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Product List */}
      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#FF9F43" style={styles.loader} />
        ) : (
          filteredProducts.map((product, index) => (
            <View key={`product-${product._id}-${index}`} style={styles.productCard}>
              {product.imageUrl ? (
                <Image 
                  key={`image-${product._id}-${index}`}
                  source={{ uri: product.imageUrl }} 
                  style={styles.productListImage} 
                />
              ) : (
                <View key={`placeholder-${product._id}-${index}`} style={styles.productListImagePlaceholder}>
                  <Ionicons name="image-outline" size={24} color="#999" />
                </View>
              )}
              <View key={`info-${product._id}-${index}`} style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productCategory}>{product.category}</Text>
              </View>
              <View key={`details-${product._id}-${index}`} style={styles.productDetails}>
                <Text style={styles.productPrice}>₱{product.price.toFixed(2)}</Text>
              </View>
              <View key={`actions-${product._id}-${index}`} style={styles.productActions}>
                <TouchableOpacity
                  key={`edit-${product._id}-${index}`}
                  style={styles.editButton}
                  onPress={() => openEditModal(product)}
                >
                  <Ionicons name="pencil-outline" size={20} color="#FF9F43" />
                </TouchableOpacity>
                <TouchableOpacity
                  key={`delete-${product._id}-${index}`}
                  style={styles.deleteButton}
                  onPress={() => handleDeleteProduct(product._id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  addButton: {
    backgroundColor: '#fff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 25,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#2C3E50',
  },
  addProductContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  productImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePlaceholderText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#999',
    marginTop: 8,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF9F43',
  },
  imageButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#FF9F43',
  },
  inputContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 25,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  input: {
    height: 45,
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#2C3E50',
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    marginTop: 4,
    marginLeft: 16,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#FF9F43',
  },
  buttonText: {
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productListImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productListImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
  },
  productCategory: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    marginTop: 4,
  },
  productDetails: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#4CAF50',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
}); 