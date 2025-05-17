import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useFonts } from 'expo-font';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { salesService } from './services/api';

interface ReportData {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  dailyTrend: { date: string; amount: number }[];
  weeklyDistribution: { day: string; amount: number }[];
  monthlyBreakdown: { month: string; amount: number }[];
}

export default function ReportsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [reportFile, setReportFile] = useState<{ uri: string; name: string } | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [reportData, setReportData] = useState<ReportData>({
    dailySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    dailyTrend: [],
    weeklyDistribution: [],
    monthlyBreakdown: []
  });

  const [fontsLoaded] = useFonts({
    'Outfit-Regular': require('../assets/fonts/Outfit-Regular.ttf'),
    'Outfit-Bold': require('../assets/fonts/Outfit-Bold.ttf'),
  });

  const requestPermissions = async () => {
    try {
      console.log('Starting permission request...');
      if (Platform.OS === 'ios') {
        console.log('Requesting iOS permissions...');
        const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync(false);
        console.log('iOS Media Library permission status:', mediaStatus);
        
        setPermissionStatus(mediaStatus);
        setHasPermission(mediaStatus === 'granted');
        return mediaStatus === 'granted';
      } else {
        console.log('Requesting Android permissions...');
        // For Android, we need to request permissions one by one
        const mediaPermission = await MediaLibrary.requestPermissionsAsync(false);
        console.log('Media Library permission:', mediaPermission);

        if (mediaPermission.status !== 'granted') {
          console.log('Media Library permission denied');
          return false;
        }

        // Request storage permissions
        const writePermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: "Storage Permission Required",
            message: "Vetra needs access to your storage to save reports",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        console.log('Write permission:', writePermission);

        const readPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: "Storage Permission Required",
            message: "Vetra needs access to your storage to save reports",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        console.log('Read permission:', readPermission);

        const allGranted = 
          mediaPermission.status === 'granted' &&
          writePermission === PermissionsAndroid.RESULTS.GRANTED &&
          readPermission === PermissionsAndroid.RESULTS.GRANTED;

        console.log('All permissions granted:', allGranted);
        setPermissionStatus(allGranted ? 'granted' : 'denied');
        setHasPermission(allGranted);
        return allGranted;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissionStatus('denied');
      setHasPermission(false);
      return false;
    }
  };

  const handlePermissionRequest = async () => {
    console.log('Handling permission request...');
    const granted = await requestPermissions();
    
    if (!granted) {
      console.log('Permissions not granted, showing alert...');
      Alert.alert(
        'Permission Required',
        'Storage permission is required to save reports. Would you like to grant permission?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => console.log('Permission denied by user')
          },
          {
            text: 'Open Settings',
            onPress: () => {
              console.log('Opening settings...');
              if (Platform.OS === 'ios') {
                Linking.openSettings();
              } else {
                Linking.openSettings();
              }
            }
          }
        ]
      );
      return false;
    }
    console.log('Permissions granted successfully');
    return true;
  };

  useEffect(() => {
    const checkInitialPermissions = async () => {
      console.log('Checking initial permissions...');
      if (Platform.OS === 'ios') {
        const { status } = await MediaLibrary.getPermissionsAsync();
        console.log('iOS initial permission status:', status);
        setPermissionStatus(status);
        setHasPermission(status === 'granted');
      } else {
        try {
          const mediaStatus = await MediaLibrary.getPermissionsAsync();
          const writeStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
          const readStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
          
          console.log('Android initial permissions:', {
            media: mediaStatus.status,
            write: writeStatus,
            read: readStatus
          });

          const allGranted = 
            mediaStatus.status === 'granted' &&
            writeStatus &&
            readStatus;

          setPermissionStatus(allGranted ? 'granted' : 'denied');
          setHasPermission(allGranted);
        } catch (error) {
          console.error('Error checking Android permissions:', error);
          setPermissionStatus('denied');
          setHasPermission(false);
        }
      }
    };

    checkInitialPermissions();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Fetch sales data
      const sales = await salesService.getSales();
      
      // Calculate date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

      // Calculate sales totals
      const dailySales = sales
        .filter(sale => new Date(sale.date) >= today)
        .reduce((sum, sale) => sum + sale.totalAmount, 0);

      const weeklySales = sales
        .filter(sale => new Date(sale.date) >= weekAgo)
        .reduce((sum, sale) => sum + sale.totalAmount, 0);

      const monthlySales = sales
        .filter(sale => new Date(sale.date) >= monthAgo)
        .reduce((sum, sale) => sum + sale.totalAmount, 0);

      // Calculate daily trend (last 7 days)
      const dailyTrend = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        const dayTotal = sales
          .filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= dayStart && saleDate < dayEnd;
          })
          .reduce((sum, sale) => sum + sale.totalAmount, 0);

        return {
          date: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
          amount: dayTotal
        };
      }).reverse();

      // Calculate weekly distribution
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyDistribution = weekdays.map(day => {
        const dayTotal = sales
          .filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= weekAgo && weekdays[saleDate.getDay()] === day;
          })
          .reduce((sum, sale) => sum + sale.totalAmount, 0);

        return {
          day,
          amount: dayTotal
        };
      });

      // Calculate monthly breakdown (last 6 months)
      const monthlyBreakdown = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthTotal = sales
          .filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= monthStart && saleDate <= monthEnd;
          })
          .reduce((sum, sale) => sum + sale.totalAmount, 0);

        return {
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          amount: monthTotal
        };
      }).reverse();
      
      // Update report data
      setReportData({
        dailySales,
        weeklySales,
        monthlySales,
        dailyTrend,
        weeklyDistribution,
        monthlyBreakdown
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  const handleDownload = async () => {
    console.log('Download button pressed');
    if (!reportFile) {
      console.log('No report file available');
      return;
    }
    
    try {
      console.log('Checking permissions...');
      // Check and request permissions first
      if (!hasPermission) {
        console.log('No permission, requesting...');
        const granted = await handlePermissionRequest();
        if (!granted) {
          console.log('Permission not granted');
          return;
        }
      }

      console.log('Permission granted, proceeding with download');
      console.log('Platform:', Platform.OS);
      console.log('Report file:', reportFile);

      if (Platform.OS === 'android') {
        try {
          // First verify the source file exists
          const sourceFileInfo = await FileSystem.getInfoAsync(reportFile.uri);
          console.log('Source file info:', sourceFileInfo);
          
          if (!sourceFileInfo.exists) {
            throw new Error('Source file does not exist');
          }

          // Create a directory for reports if it doesn't exist
          const reportDir = `${FileSystem.documentDirectory}reports/`;
          console.log('Creating report directory at:', reportDir);
          
          const dirInfo = await FileSystem.getInfoAsync(reportDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(reportDir, { intermediates: true });
          }

          // Create a temporary location in the reports directory
          const tempUri = `${reportDir}${reportFile.name}`;
          console.log('Saving to temporary location:', tempUri);
          
          // Copy to temporary location
          await FileSystem.copyAsync({
            from: reportFile.uri,
            to: tempUri
          });

          // Verify the temporary file
          const tempFileInfo = await FileSystem.getInfoAsync(tempUri);
          console.log('Temporary file info:', tempFileInfo);
          
          if (!tempFileInfo.exists) {
            throw new Error('Failed to create temporary file');
          }

          // Save to media library
          console.log('Saving to media library...');
          const asset = await MediaLibrary.createAssetAsync(tempUri);
          console.log('Asset created:', asset);
          
          if (!asset) {
            throw new Error('Failed to create asset in media library');
          }

          // Try to create the album and add the asset
          try {
            console.log('Adding to album...');
            const album = await MediaLibrary.getAlbumAsync('Vetra POS Reports');
            if (album === null) {
              await MediaLibrary.createAlbumAsync('Vetra POS Reports', asset, false);
              console.log('New album created');
            } else {
              await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
              console.log('Added to existing album');
            }
          } catch (albumError) {
            console.log('Album operation failed, but file was saved:', albumError);
          }

          // Clean up the temporary file
          console.log('Cleaning up temporary file...');
          await FileSystem.deleteAsync(tempUri, { idempotent: true });

          Alert.alert(
            'Success',
            'Report saved successfully!',
            [
              {
                text: 'View',
                onPress: async () => {
                  try {
                    await Linking.openURL(asset.uri);
                    setShowModal(false);
                  } catch (err) {
                    console.log('Error opening file:', err);
                    Alert.alert('Note', 'The file has been saved. You can find it in your Gallery or Documents folder.');
                  }
                },
              },
              {
                text: 'Close',
                onPress: () => setShowModal(false),
                style: 'cancel',
              },
            ]
          );
        } catch (err) {
          console.error('Download error:', err);
          throw new Error(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } else {
        // For iOS, use the sharing dialog
        console.log('Using iOS sharing dialog');
        await Sharing.shareAsync(reportFile.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Report',
          UTI: 'com.adobe.pdf'
        });
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error during download:', error);
      Alert.alert(
        'Error',
        `Unable to save the report: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        [
          {
            text: 'Retry',
            onPress: handleDownload
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setShowModal(false)
          }
        ]
      );
    }
  };

  const handleShare = async () => {
    if (!reportFile) return;
    
    try {
      await Sharing.shareAsync(reportFile.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Report',
        UTI: 'com.adobe.pdf'
      });
      setShowModal(false);
    } catch (error) {
      console.error('Error sharing file:', error);
      Alert.alert('Error', 'Failed to share the report');
    }
  };

  const generatePDF = async () => {
    try {
      console.log('Starting PDF generation...');
      setLoading(true);

      // Format the current date and time for filename
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');
      const timeStr = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      }).replace(':', '-');
      
      const filename = `vetra-sales-report-${dateStr}-${timeStr}.pdf`;
      console.log('Generated filename:', filename);

      // Create HTML content for the PDF
      console.log('Creating HTML content...');
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body {
                font-family: 'Helvetica';
                padding: 40px;
                color: #2C3E50;
                line-height: 1.6;
              }
              .header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 3px solid #FF9F43;
                padding-bottom: 20px;
              }
              .logo {
                font-size: 28px;
                font-weight: bold;
                color: #FF9F43;
                margin-bottom: 10px;
              }
              .title {
                font-size: 24px;
                font-weight: bold;
                color: #2C3E50;
              }
              .date {
                color: #666;
                margin-top: 10px;
                font-size: 14px;
              }
              .section {
                margin-bottom: 40px;
              }
              .section-title {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #2C3E50;
                border-bottom: 2px solid #FF9F43;
                padding-bottom: 10px;
              }
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 30px;
              }
              .summary-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
              }
              .card-title {
                font-size: 16px;
                color: #666;
                margin-bottom: 10px;
              }
              .card-value {
                font-size: 24px;
                font-weight: bold;
                color: #FF9F43;
              }
              .card-subtitle {
                font-size: 12px;
                color: #666;
                margin-top: 5px;
              }
              .chart-container {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin-bottom: 30px;
              }
              .chart-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #2C3E50;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
              }
              th {
                background-color: #f8f9fa;
                font-weight: bold;
                color: #2C3E50;
              }
              .footer {
                margin-top: 60px;
                text-align: center;
                color: #666;
                font-size: 12px;
                border-top: 1px solid #ddd;
                padding-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">VETRA POS</div>
              <div class="title">Sales Report</div>
              <div class="date">Generated on ${now.toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })} at ${now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}</div>
            </div>

            <div class="section">
              <div class="section-title">Sales Overview</div>
              <div class="summary-grid">
                <div class="summary-card">
                  <div class="card-title">Daily Sales</div>
                  <div class="card-value">${formatCurrency(reportData.dailySales)}</div>
                  <div class="card-subtitle">Today's Revenue</div>
                </div>
                <div class="summary-card">
                  <div class="card-title">Weekly Sales</div>
                  <div class="card-value">${formatCurrency(reportData.weeklySales)}</div>
                  <div class="card-subtitle">Last 7 Days</div>
                </div>
                <div class="summary-card">
                  <div class="card-title">Monthly Sales</div>
                  <div class="card-value">${formatCurrency(reportData.monthlySales)}</div>
                  <div class="card-subtitle">Last 30 Days</div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Daily Sales Trend</div>
              <div class="chart-container">
                <table>
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Sales Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reportData.dailyTrend.map(item => `
                      <tr>
                        <td>${item.date}</td>
                        <td>${formatCurrency(item.amount)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Weekly Distribution</div>
              <div class="chart-container">
                <table>
                  <thead>
                    <tr>
                      <th>Day of Week</th>
                      <th>Sales Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reportData.weeklyDistribution.map(item => `
                      <tr>
                        <td>${item.day}</td>
                        <td>${formatCurrency(item.amount)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Monthly Breakdown</div>
              <div class="chart-container">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Sales Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${reportData.monthlyBreakdown.map(item => `
                      <tr>
                        <td>${item.month}</td>
                        <td>${formatCurrency(item.amount)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="footer">
              <p>Generated by Vetra POS System</p>
              <p>© ${new Date().getFullYear()} All rights reserved</p>
            </div>
          </body>
        </html>
      `;

      // Generate PDF
      console.log('Calling printToFileAsync...');
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: 612, // Standard US Letter width in points (8.5 inches * 72)
        height: 792 // Standard US Letter height in points (11 inches * 72)
      });
      console.log('PDF generated at:', uri);

      // Set the report file info and show modal
      const reportFileInfo = { uri, name: filename };
      console.log('Setting report file:', reportFileInfo);
      setReportFile(reportFileInfo);
      setShowModal(true);

    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Chart configurations
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 159, 67, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForLabels: {
      fontSize: 12
    }
  };

  const screenWidth = Dimensions.get('window').width - 32; // 32 is total horizontal padding

  const getCommonChartProps = () => ({
    width: screenWidth,
    height: 220,
    chartConfig,
    style: styles.chart as any,
    yAxisLabel: "₱",
    yAxisSuffix: "",
    withInnerLines: false,
    fromZero: true
  });

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
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={generatePDF} style={styles.pdfButton}>
            <Ionicons name="document-text-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={fetchReportData} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF9F43" />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>Sales Overview</Text>
                  <Text style={styles.sectionSubtitle}>Revenue summary</Text>
                </View>
                <View style={[styles.sectionIconContainer, { backgroundColor: '#FFF5EB' }]}>
                  <Ionicons name="trending-up" size={20} color="#FF9F43" />
                </View>
              </View>
              <View style={styles.reportGrid}>
                <View style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <View style={[styles.reportIconContainer, { backgroundColor: '#FFF5EB' }]}>
                      <Ionicons name="cash-outline" size={20} color="#FF9F43" />
                    </View>
                    <Text style={styles.reportTitle}>Daily Sales</Text>
                  </View>
                  <Text style={styles.reportValue}>{formatCurrency(reportData.dailySales)}</Text>
                  <Text style={styles.reportSubtitle}>Today's Revenue</Text>
                </View>
                <View style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <View style={[styles.reportIconContainer, { backgroundColor: '#FFF5EB' }]}>
                      <Ionicons name="cash-outline" size={20} color="#FF9F43" />
                    </View>
                    <Text style={styles.reportTitle}>Weekly Sales</Text>
                  </View>
                  <Text style={styles.reportValue}>{formatCurrency(reportData.weeklySales)}</Text>
                  <Text style={styles.reportSubtitle}>Last 7 Days</Text>
                </View>
                <View style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <View style={[styles.reportIconContainer, { backgroundColor: '#FFF5EB' }]}>
                      <Ionicons name="cash-outline" size={20} color="#FF9F43" />
                    </View>
                    <Text style={styles.reportTitle}>Monthly Sales</Text>
                  </View>
                  <Text style={styles.reportValue}>{formatCurrency(reportData.monthlySales)}</Text>
                  <Text style={styles.reportSubtitle}>Last 30 Days</Text>
                </View>
              </View>
            </View>

            {/* Daily Sales Trend Chart */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>Daily Sales Trend</Text>
                  <Text style={styles.sectionSubtitle}>Last 7 days</Text>
                </View>
              </View>
              <View style={[styles.chartContainer as any]}>
                <LineChart
                  {...getCommonChartProps()}
                  data={{
                    labels: reportData.dailyTrend.map(item => item.date),
                    datasets: [{
                      data: reportData.dailyTrend.map(item => 
                        item.amount === 0 ? 0.1 : item.amount // Prevent empty chart when all values are 0
                      )
                    }]
                  }}
                  bezier
                  withDots={false}
                  withVerticalLines={false}
                />
              </View>
            </View>

            {/* Weekly Distribution Chart */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>Weekly Distribution</Text>
                  <Text style={styles.sectionSubtitle}>Sales by day of week</Text>
                </View>
              </View>
              <View style={[styles.chartContainer as any]}>
                <BarChart
                  {...getCommonChartProps()}
                  data={{
                    labels: reportData.weeklyDistribution.map(item => item.day),
                    datasets: [{
                      data: reportData.weeklyDistribution.map(item => 
                        item.amount === 0 ? 0.1 : item.amount
                      )
                    }]
                  }}
                  showValuesOnTopOfBars
                  flatColor
                />
              </View>
            </View>

            {/* Monthly Sales Breakdown */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
                  <Text style={styles.sectionSubtitle}>Last 6 months</Text>
                </View>
              </View>
              <View style={[styles.chartContainer as any]}>
                <BarChart
                  {...getCommonChartProps()}
                  data={{
                    labels: reportData.monthlyBreakdown.map(item => item.month),
                    datasets: [{
                      data: reportData.monthlyBreakdown.map(item => 
                        item.amount === 0 ? 0.1 : item.amount
                      )
                    }]
                  }}
                  showValuesOnTopOfBars
                  flatColor
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Report Options Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
              <Text style={styles.modalTitle}>Report Generated</Text>
              <Text style={styles.modalSubtitle}>What would you like to do with the report?</Text>
            </View>

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
              onPress={handleDownload}
            >
              <Ionicons name="download-outline" size={24} color="#fff" />
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: '#2196F3' }]}
              onPress={handleShare}
            >
              <Ionicons name="share-social-outline" size={24} color="#fff" />
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowModal(false)}
            >
              <Text style={[styles.modalButtonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfButton: {
    padding: 8,
    marginRight: 8,
  },
  refreshButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  section: {
    marginBottom: 32,
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    marginTop: 2,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    flex: 1,
    minWidth: '45%',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reportTitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
  },
  reportValue: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Outfit-Regular',
    color: '#666',
    textAlign: 'center',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 12,
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
}); 