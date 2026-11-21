import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CANON, SAFETY_NOTE } from '@vintora/shared';

const BURGUNDY = '#5B1A2B';
const GOLD = '#C9A227';
const CREAM = '#F7F1E6';

export default function App() {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mark}><Text style={styles.markText}>V</Text></View>
        <Text style={styles.brand}>VINTORA</Text>
        <Text style={styles.tagline}>{CANON.tagline}</Text>
        <Text style={styles.body}>
          Phase 3 ships the native iOS and Android client from this Expo codebase, sharing domain types
          and the design system with the web platform. Phase 1 foundation is this placeholder plus the
          browser prototype.
        </Text>
        <Text style={styles.heading}>Ten modules</Text>
        {CANON.modules.map((module) => <Text key={module} style={styles.item}>• {module}</Text>)}
        <Text style={styles.safety}>{SAFETY_NOTE}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  content: { padding: 24, alignItems: 'flex-start' },
  mark: { width: 56, height: 56, borderRadius: 28, backgroundColor: BURGUNDY, borderWidth: 2, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  markText: { color: GOLD, fontSize: 28, fontFamily: 'Georgia', fontStyle: 'italic' },
  brand: { marginTop: 12, fontSize: 22, letterSpacing: 4, fontFamily: 'Georgia', fontWeight: '700' },
  tagline: { marginTop: 8, fontSize: 18, fontFamily: 'Georgia', color: BURGUNDY },
  body: { marginTop: 16, fontSize: 14, lineHeight: 21, color: '#4A433D' },
  heading: { marginTop: 28, marginBottom: 8, fontSize: 16, fontFamily: 'Georgia', fontWeight: '700' },
  item: { fontSize: 13, lineHeight: 22, color: '#4A433D' },
  safety: { marginTop: 30, fontSize: 11, color: '#6F675E' },
});
