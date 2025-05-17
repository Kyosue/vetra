import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { authService, productService, salesService, userService } from './services/api';

// Get screen dimensions for responsive layout
const { width } = Dimensions.get('window');

interface Product {
  _id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
}

interface Sale {
  _id: string;
  items: {
    productId: string | {
      _id: string;
      name: string;
      price: number;
    };
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  date: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [userName, setUserName] = useState('');
  const [dailyStats, setDailyStats] = useState({
    totalSales: 0,
    orderCount: 0
  });

  const [fontsLoaded] = useFonts({
    'Outfit-Regular': require('../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
  });

  useEffect(() => {
    fetchProducts();
    fetchSales();
    fetchUserInfo();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await productService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSales = async () => {
    try {
      const sales = await salesService.getSales();
      setRecentSales(sales);

      // Calculate daily statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaySales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= today;
      });

      const totalSales = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const orderCount = todaySales.length;

      setDailyStats({
        totalSales,
        orderCount
      });
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };
  
  const fetchUserInfo = async () => {
    try {
      // Get user profile from userService
      const userProfile = await userService.getProfile();
      if (userProfile && userProfile.fullName) {
        // Extract first name from full name
        const firstName = userProfile.fullName.split(' ')[0];
        setUserName(firstName);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      router.replace('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const time = date.toLocaleTimeString([], { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
    const formattedDate = date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return `${time} • ${formattedDate}`;
  };

  // Format currency with thousands separators
  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF9F43" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Vetra</Text>
          {userName ? (
            <Text style={styles.greetingText}>Hello, {userName}!</Text>
          ) : (
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#FF5252' }]} />
              <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.salesCard]}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Today's Sales</Text>
              <View style={styles.statIconContainer}>
                <Ionicons name="cash-outline" size={22} color="#fff" />
              </View>
            </View>
            <Text 
              style={styles.statValue} 
              numberOfLines={1} 
              adjustsFontSizeToFit
            >
              ₱{formatCurrency(dailyStats.totalSales)}
            </Text>
          </View>
          <View style={[styles.statCard, styles.ordersCard]}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Orders</Text>
              <View style={styles.statIconContainer}>
                <Ionicons name="cart-outline" size={22} color="#fff" />
              </View>
            </View>
            <Text style={styles.statValue}>{dailyStats.orderCount}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <Text style={styles.sectionSubtitle}>Access key features</Text>
            </View>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="flash" size={22} color="#FF9F43" />
            </View>
          </View>
          <View style={styles.quickActions}>
            {[
              {
                icon: "cart-outline" as const,
                text: "New Sale",
                subtext: "Start transaction",
                color: "#FF9F43",
                bgColor: "#FFF5EB",
                onPress: () => router.push('/new-sale')
              },
              {
                icon: "list-outline" as const,
                text: "Inventory",
                subtext: "Manage stock",
                color: "#4CAF50",
                bgColor: "#E8F5E9",
                onPress: () => router.push('/inventory')
              },
              {
                icon: "bar-chart-outline" as const,
                text: "Reports",
                subtext: "View analytics",
                color: "#2196F3",
                bgColor: "#E3F2FD",
                onPress: () => router.push('/reports')
              }
            ].map((action, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.actionButton}
                onPress={action.onPress}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: action.bgColor }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionText}>{action.text}</Text>
                  <Text style={styles.actionSubtext}>{action.subtext}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
            </View>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/reports')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#FF9F43" />
            </TouchableOpacity>
          </View>
          <View style={styles.transactionList}>
            {recentSales.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={32} color="#CCC" />
                <Text style={styles.emptyText}>No recent transactions</Text>
              </View>
            ) : (
              recentSales.slice(0, 5).map((sale, index) => (
                <View 
                  key={sale._id} 
                  style={[
                    styles.transactionItem,
                    index === recentSales.slice(0, 5).length - 1 && styles.lastTransaction
                  ]}
                >
                  <View style={styles.transactionLeft}>
                    <View style={styles.transactionIcon}>
                      <Ionicons name="receipt-outline" size={18} color="#FF9F43" />
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTime}>{formatDate(sale.date)}</Text>
                      <Text style={styles.transactionItems}>
                        {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.transactionAmount}>₱{formatCurrency(sale.totalAmount)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
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
  headerLeft: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Outfit-Bold',
    color: '#fff',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
  },
  greetingText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  logoutButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  statCard: {
    borderRadius: 20,
    padding: 20,
    flex: 0.48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  salesCard: {
    backgroundColor: '#FF9F43',
  },
  ordersCard: {
    backgroundColor: '#4CAF50',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontFamily: 'Outfit-Bold',
    color: '#fff',
    textAlign: 'left',
  },
  statLabel: {
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  sectionIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 2,
    shadowColor: '#FF9F43',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: width * 0.28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  actionIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  actionTextContainer: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtext: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    textAlign: 'center',
  },
  transactionList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    minHeight: 100,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(255, 159, 67, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  viewAllText: {
    color: '#FF9F43',
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastTransaction: {
    borderBottomWidth: 0,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 159, 67, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTime: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  transactionItems: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#4CAF50',
  },
}); 