import { StyleSheet } from 'react-native';

export const getStyles = (colors, theme) => {
    const isDark = theme === 'dark';
    return StyleSheet.create({
        centerHeader: {
            alignItems: 'center',
            marginBottom: 26,
        },
        iconContainer: {
            width: 74,
            height: 74,
            borderRadius: 37,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
        },
        iconContainerSmall: {
            width: 70,
            height: 70,
            borderRadius: 35,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
            borderWidth: 1.5,
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: '800',
            color: colors.text,
            marginBottom: 5,
            letterSpacing: 0.2,
        },
        headerTitleSmall: {
            fontSize: 19,
            fontWeight: '800',
            color: colors.text,
            letterSpacing: 0.2,
        },
        headerSubtitle: {
            fontSize: 13,
            color: colors.subtext,
            textAlign: 'center',
            lineHeight: 20,
        },
        buttonRow: {
            flexDirection: 'row',
            gap: 10,
            marginTop: 22,
        },
        buttonRowSmall: {
            flexDirection: 'row',
            gap: 10,
            marginTop: 20,
        },
        termsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 6,
            paddingHorizontal: 2,
        },
        checkbox: {
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
        },
        termsText: {
            flex: 1,
            fontSize: 13,
            color: colors.subtext,
            lineHeight: 18,
        },
        datePickerBtn: {
            height: 50,
            borderRadius: 13,
            borderWidth: 1.5,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
            justifyContent: 'space-between',
        },
        datePickerContent: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        gridRow: {
            flexDirection: 'row',
            gap: 10,
            marginBottom: 0,
        },
        chipsGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 16,
        },
        customConditionWrapper: {
            marginBottom: 12,
        },
        resendBtnWrapperSmall: {
            alignItems: 'center',
            marginTop: 18,
        },
        avatarHeader: {
            alignItems: 'center',
            marginBottom: 16,
        },
        avatarBadge: {
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 4,
            backgroundColor: colors.primary + '18',
            borderRadius: 20,
        },
        iosDatePickerModal: {
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.3)',
        },
        iosDatePickerContainer: {
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            paddingBottom: 30,
        },
        iosDatePickerHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1.5,
        },
    });
};
