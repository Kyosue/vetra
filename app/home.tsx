import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { authService, productService, salesService } from './services/api';

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
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#FF5252' }]} />
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
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
      <ScrollView style={styles.content}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.salesCard]}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Today's Sales</Text>
              <View style={styles.statIconContainer}>
                <Ionicons name="cash-outline" size={24} color="#fff" />
              </View>
            </View>
            <Text style={styles.statValue}>₱{dailyStats.totalSales.toFixed(2)}</Text>
          </View>
          <View style={[styles.statCard, styles.ordersCard]}>
            <View style={styles.statHeader}>
              <Text style={styles.statLabel}>Orders</Text>
              <View style={styles.statIconContainer}>
                <Ionicons name="cart-outline" size={24} color="#fff" />
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
              <Ionicons name="flash" size={24} color="#FF9F43" />
            </View>
          </View>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/new-sale')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FFF5EB' }]}>
                <Ionicons name="cart-outline" size={24} color="#FF9F43" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionText}>New Sale</Text>
                <Text style={styles.actionSubtext}>Start transaction</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/inventory')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="list-outline" size={24} color="#4CAF50" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionText}>Inventory</Text>
                <Text style={styles.actionSubtext}>Manage stock</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/reports')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="bar-chart-outline" size={24} color="#2196F3" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionText}>Reports</Text>
                <Text style={styles.actionSubtext}>View analytics</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => router.push('/reports')}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.transactionList}>
            {recentSales.length === 0 ? (
              <Text style={styles.emptyText}>No recent transactions</Text>
            ) : (
              recentSales.slice(0, 5).map((sale) => (
                <View key={sale._id} style={styles.transactionItem}>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTime}>{formatDate(sale.date)}</Text>
                    <Text style={styles.transactionItems}>
                      {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                  <Text style={styles.transactionAmount}>₱{sale.totalAmount.toFixed(2)}</Text>
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
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    color: '#fff',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flex: 1,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
    marginBottom: 12,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
    color: '#fff',
    textAlign: 'left',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    marginTop: 2,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '31%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  actionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTextContainer: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  transactionList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllButton: {
    padding: 8,
  },
  viewAllText: {
    color: '#FF9F43',
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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