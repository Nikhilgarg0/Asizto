// screens/AppointmentsTab.js - Enhanced Version
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { db } from '../firebaseConfig';
import { doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import * as Notifications from 'expo-notifications';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');

export default function AppointmentsTab() {
  const { colors, theme } = useTheme();
  const navigation = useNavigation();
  // ── Shared data from DataContext (single listener) ──
  const { appointments, loadingAppts: loading } = useData();

  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');

  // Dropdown visibility state
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    let filtered = [...appointments];

    if (filterStatus === 'upcoming') {
      filtered = filtered.filter(apt => {
        const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
        return aptDate > new Date();
      });
    } else if (filterStatus === 'past') {
      filtered = filtered.filter(apt => {
        const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
        return aptDate <= new Date();
      });
    }

    filtered.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);

      switch (sortBy) {
        case 'date':
          return dateA - dateB;
        case 'doctor':
          return (a.doctorName || a.with || '').localeCompare(b.doctorName || b.with || '');
        default:
          return dateA - dateB;
      }
    });

    setFilteredAppointments(filtered);
  }, [appointments, sortBy, filterStatus]);

  const handleDelete = (appointmentId) => {
    Alert.alert(
      "Delete Appointment",
      "Are you sure you want to delete this appointment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const apptDocRef = doc(db, 'appointments', appointmentId);
              const apptSnap = await getDoc(apptDocRef);
              const data = apptSnap.exists() ? apptSnap.data() : null;
              const ids = data?.notificationIds || [];
              for (const nid of ids) {
                try {
                  await Notifications.cancelScheduledNotificationAsync(nid);
                } catch (e) {
                  console.warn('Failed to cancel notification', nid, e);
                }
              }
              await deleteDoc(apptDocRef);
            } catch (err) {
              console.error('Delete appointment error', err);
              Alert.alert('Error', 'Could not delete appointment.');
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleMarkAttended = async (appointment) => {
    try {
      const apptRef = doc(db, 'appointments', appointment.id);
      const ids = appointment?.notificationIds || [];
      for (const nid of ids) {
        try {
          await Notifications.cancelScheduledNotificationAsync(nid);
        } catch (e) {
          console.warn('Failed to cancel notification', nid, e);
        }
      }
      await updateDoc(apptRef, {
        attended: true,
        attendedAt: new Date()
      });
      Alert.alert('Success', 'Appointment marked as attended.');
    } catch (err) {
      console.error('Mark attended error', err);
      Alert.alert('Error', 'Could not mark appointment as attended.');
    }
  };

  const getTimeUntil = (date) => {
    const now = new Date();
    const diff = date - now;

    if (diff < 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `in ${days}d ${hours}h`;
    if (hours > 0) return `in ${hours}h`;
    return 'Soon';
  };

  const styles = createStyles(colors, theme);

  const getStatusColor = (item) => {
    if (item.attended) return '#27ae60';

    const aptDateObj = item.date && item.date.toDate ? item.date.toDate() : (item.date ? new Date(item.date) : null);
    if (!aptDateObj) return colors.primary;

    const now = new Date();
    const diff = aptDateObj - now;
    const hours = diff / (1000 * 60 * 60);

    if (diff < 0) return '#95a5a6';
    if (hours <= 24) return '#e74c3c';
    if (hours <= 72) return '#f39c12';
    return colors.primary;
  };

  const getStatusIcon = (item) => {
    if (item.attended) return 'checkmark-circle';

    const aptDateObj = item.date && item.date.toDate ? item.date.toDate() : (item.date ? new Date(item.date) : null);
    if (!aptDateObj) return 'calendar';

    const now = new Date();
    const diff = aptDateObj - now;
    const hours = diff / (1000 * 60 * 60);

    if (diff < 0) return 'time-outline';
    if (hours <= 24) return 'alert-circle';
    return 'calendar';
  };

  const formatAppointmentDate = (date) => {
    if (!date) return '';
    const aptDate = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = aptDate.toDateString() === now.toDateString();
    const isTomorrow = aptDate.toDateString() === tomorrow.toDateString();

    const timeStr = aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;

    return aptDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Stats calculation
  const upcomingCount = appointments.filter(apt => {
    const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
    return aptDate > new Date() && !apt.attended;
  }).length;

  const attendedCount = appointments.filter(apt => apt.attended).length;

  // Dropdown option labels
  const filterLabels = { all: 'All', upcoming: 'Upcoming', past: 'Past' };
  const sortLabels = { date: 'By Date', doctor: 'By Doctor' };

  const closeDropdowns = () => {
    setShowSortDropdown(false);
    setShowFilterDropdown(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.subtext, fontSize: 16 }}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── Compact Stats Strip ── */}
      <Animatable.View animation="fadeInDown" duration={500} style={styles.statsStrip}>
        <View style={styles.statChip}>
          <View style={[styles.statDot, { backgroundColor: `${colors.primary}25` }]}>
            <Ionicons name="calendar" size={13} color={colors.primary} />
          </View>
          <Text style={styles.statChipValue}>{appointments.length}</Text>
          <Text style={styles.statChipLabel}>Total</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statChip}>
          <View style={[styles.statDot, { backgroundColor: '#fef3e2' }]}>
            <Ionicons name="time" size={13} color="#f39c12" />
          </View>
          <Text style={styles.statChipValue}>{upcomingCount}</Text>
          <Text style={styles.statChipLabel}>Upcoming</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statChip}>
          <View style={[styles.statDot, { backgroundColor: '#e8f5e9' }]}>
            <Ionicons name="checkmark-done" size={13} color="#27ae60" />
          </View>
          <Text style={styles.statChipValue}>{attendedCount}</Text>
          <Text style={styles.statChipLabel}>Attended</Text>
        </View>
      </Animatable.View>

      {/* ── Toolbar: Sort & Filter Dropdowns ── */}
      <Animatable.View animation="fadeIn" duration={500} delay={80} style={styles.toolbar}>
        <Text style={styles.toolbarCount}>
          {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''}
        </Text>

        <View style={styles.toolbarActions}>
          {/* Filter Button */}
          <View>
            <TouchableOpacity
              style={[
                styles.toolbarBtn,
                showFilterDropdown && styles.toolbarBtnActive,
                filterStatus !== 'all' && styles.toolbarBtnSelected,
              ]}
              onPress={() => {
                setShowFilterDropdown(v => !v);
                setShowSortDropdown(false);
              }}
              accessibilityLabel="Filter appointments"
              accessibilityRole="button"
            >
              <Ionicons
                name="funnel-outline"
                size={14}
                color={filterStatus !== 'all' ? '#fff' : showFilterDropdown ? colors.primary : colors.subtext}
              />
              <Text style={[
                styles.toolbarBtnText,
                (filterStatus !== 'all') && { color: '#fff' },
                showFilterDropdown && filterStatus === 'all' && { color: colors.primary },
              ]}>
                {filterLabels[filterStatus]}
              </Text>
              <Ionicons
                name={showFilterDropdown ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={filterStatus !== 'all' ? '#fff' : showFilterDropdown ? colors.primary : colors.subtext}
              />
            </TouchableOpacity>

            {showFilterDropdown && (
              <View style={[styles.dropdown, { right: 0 }]}>
                {[
                  { key: 'all', icon: 'apps-outline', label: 'All' },
                  { key: 'upcoming', icon: 'arrow-forward-circle-outline', label: 'Upcoming' },
                  { key: 'past', icon: 'time-outline', label: 'Past' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.dropdownItem, filterStatus === opt.key && styles.dropdownItemActive]}
                    onPress={() => { setFilterStatus(opt.key); setShowFilterDropdown(false); }}
                    accessibilityLabel={`Filter: ${opt.label}`}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={opt.icon}
                      size={15}
                      color={filterStatus === opt.key ? colors.primary : colors.subtext}
                    />
                    <Text style={[
                      styles.dropdownItemText,
                      filterStatus === opt.key && { color: colors.primary, fontWeight: '700' },
                    ]}>
                      {opt.label}
                    </Text>
                    {filterStatus === opt.key && (
                      <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Sort Button */}
          <View>
            <TouchableOpacity
              style={[
                styles.toolbarBtn,
                showSortDropdown && styles.toolbarBtnActive,
              ]}
              onPress={() => {
                setShowSortDropdown(v => !v);
                setShowFilterDropdown(false);
              }}
              accessibilityLabel="Sort appointments"
              accessibilityRole="button"
            >
              <Ionicons
                name="swap-vertical-outline"
                size={14}
                color={showSortDropdown ? colors.primary : colors.subtext}
              />
              <Text style={[
                styles.toolbarBtnText,
                showSortDropdown && { color: colors.primary },
              ]}>
                {sortLabels[sortBy]}
              </Text>
              <Ionicons
                name={showSortDropdown ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={showSortDropdown ? colors.primary : colors.subtext}
              />
            </TouchableOpacity>

            {showSortDropdown && (
              <View style={[styles.dropdown, { right: 0 }]}>
                {[
                  { key: 'date', icon: 'calendar-outline', label: 'By Date' },
                  { key: 'doctor', icon: 'person-outline', label: 'By Doctor' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.dropdownItem, sortBy === opt.key && styles.dropdownItemActive]}
                    onPress={() => { setSortBy(opt.key); setShowSortDropdown(false); }}
                    accessibilityLabel={`Sort: ${opt.label}`}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={opt.icon}
                      size={15}
                      color={sortBy === opt.key ? colors.primary : colors.subtext}
                    />
                    <Text style={[
                      styles.dropdownItemText,
                      sortBy === opt.key && { color: colors.primary, fontWeight: '700' },
                    ]}>
                      {opt.label}
                    </Text>
                    {sortBy === opt.key && (
                      <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </Animatable.View>

      {/* Dismiss dropdowns when tapping list area */}
      {(showFilterDropdown || showSortDropdown) && (
        <TouchableWithoutFeedback onPress={closeDropdowns}>
          <View style={StyleSheet.absoluteFill} pointerEvents="box-only" />
        </TouchableWithoutFeedback>
      )}

      {/* ── Appointments List ── */}
      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={closeDropdowns}
        renderItem={({ item, index }) => {
          const aptDateObj = item.date && item.date.toDate ? item.date.toDate() : (item.date ? new Date(item.date) : null);
          const isPast = aptDateObj ? (aptDateObj <= new Date()) : false;
          const canShowMark = aptDateObj ? (aptDateObj <= new Date()) : false;
          const timeUntil = aptDateObj ? getTimeUntil(aptDateObj) : null;
          const statusColor = getStatusColor(item);
          const statusIcon = getStatusIcon(item);

          return (
            <Animatable.View
              animation="fadeInUp"
              duration={500}
              delay={index * 50}
              style={styles.appointmentCard}
            >
              {/* Status Indicator Bar */}
              <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

              {/* Card Header */}
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentHeaderLeft}>
                  <View style={[styles.doctorIconCircle, { backgroundColor: `${statusColor}15` }]}>
                    <Ionicons name="person" size={20} color={statusColor} />
                  </View>
                  <View style={styles.appointmentHeaderInfo}>
                    <Text style={styles.doctorName} numberOfLines={1}>
                      {item.doctorName || item.with || 'Appointment'}
                    </Text>
                    <Text style={styles.appointmentDateTime}>
                      {formatAppointmentDate(item.date)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  style={styles.deleteIconButton}
                  accessibilityLabel={`Delete appointment with ${item.doctorName ?? 'doctor'}`}
                  accessibilityRole="button"
                >
                  <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>

              {/* Card Body */}
              {item.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={16} color={colors.primary} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              )}

              {/* Time Until Badge */}
              {timeUntil && !item.attended && (
                <View style={styles.timeUntilBadge}>
                  <Ionicons name="timer-outline" size={14} color={statusColor} />
                  <Text style={[styles.timeUntilText, { color: statusColor }]}>
                    {timeUntil}
                  </Text>
                </View>
              )}

              {/* Attended Status */}
              {item.attended && (
                <View style={styles.attendedBanner}>
                  <Ionicons name="checkmark-circle" size={18} color="#27ae60" />
                  <Text style={styles.attendedBannerText}>
                    Attended {item.attendedAt ? (
                      item.attendedAt.toDate
                        ? `on ${item.attendedAt.toDate().toLocaleDateString()}`
                        : `on ${new Date(item.attendedAt).toLocaleDateString()}`
                    ) : ''}
                  </Text>
                </View>
              )}

              {/* Card Footer */}
              <View style={styles.appointmentFooter}>
                <View style={styles.statusBadge}>
                  <Ionicons name={statusIcon} size={14} color={statusColor} />
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                    {item.attended ? 'Completed' : isPast ? 'Missed' : 'Scheduled'}
                  </Text>
                </View>

                {!item.attended && canShowMark && (
                  <TouchableOpacity
                    onPress={() => handleMarkAttended(item)}
                    style={[styles.markAttendedButton, { backgroundColor: statusColor }]}
                    accessibilityLabel={`Mark appointment with ${item.doctorName ?? 'doctor'} as attended`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.markAttendedButtonText}>Mark Attended</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animatable.View>
          );
        }}
        ListEmptyComponent={
          <Animatable.View animation="fadeIn" duration={600} style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={56} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {filterStatus === 'all' ? 'No Appointments Yet' :
                filterStatus === 'upcoming' ? 'No Upcoming Appointments' :
                  'No Past Appointments'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filterStatus === 'all' ? 'Start tracking your medical appointments by adding your first one.' :
                filterStatus === 'upcoming' ? 'All your appointments are in the past or completed.' :
                  'You have no past appointment records.'}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddAppointment')}
              style={styles.emptyButton}
              accessibilityLabel="Add new appointment"
              accessibilityRole="link"
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Add Appointment</Text>
            </TouchableOpacity>
          </Animatable.View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddAppointment')}
        accessibilityLabel="Add new appointment"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Compact Stats Strip ──
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 10,
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme === 'dark' ? 0.25 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  statDot: {
    width: 22,
    height: 22,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statChipValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  statChipLabel: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '500',
  },
  statDivider: {
    width: 1.5,
    height: 22,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },

  // ── Toolbar ──
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
    zIndex: 100,
  },
  toolbarCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 100,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolbarBtnActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  toolbarBtnSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toolbarBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.subtext,
  },

  // ── Dropdown ──
  dropdown: {
    position: 'absolute',
    top: 38,
    minWidth: 150,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme === 'dark' ? 0.4 : 0.12,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 999,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemActive: {
    backgroundColor: `${colors.primary}0D`,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },

  // ── List ──
  listContent: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },

  // ── Appointment Card ──
  appointmentCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statusBar: {
    height: 3,
    width: '100%',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 10,
  },
  appointmentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  doctorIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  appointmentHeaderInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 3,
  },
  appointmentDateTime: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },
  deleteIconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: `${colors.background}80`,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  timeUntilBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginHorizontal: 14,
    marginBottom: 10,
    gap: 5,
  },
  timeUntilText: {
    fontSize: 12,
    fontWeight: '700',
  },
  attendedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 8,
    gap: 6,
  },
  attendedBannerText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '700',
    flex: 1,
  },
  appointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  markAttendedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  markAttendedButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Empty State ──
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});