import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../../lib/api';

export default function EducationScreen() {
  const router = useRouter();
  const categories = ["Hygiene", "Procedures", "Children", "Emergency", "Nutrition", "Orthodontics"];
  const [activeCategory, setActiveCategory] = useState("Hygiene");
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/education/articles');
      setArticles(res.data);
    } catch (e) {
      console.log('Error loading articles', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dental Education</Text>
      </View>
      
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.categoryChip, activeCategory === cat && styles.activeChip]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.categoryText, activeCategory === cat && styles.activeText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator size="large" color="#1A7FD4" style={{ marginTop: 40 }} />
        ) : (
          articles
            .filter(a => a.category.toLowerCase() === activeCategory.toLowerCase())
            .map((article) => (
              <TouchableOpacity 
                key={article.id} 
                style={styles.articleCard}
                onPress={() => router.push(`/education/${article.slug}`)}
              >
                <View style={styles.articleImagePlaceholder}>
                  <Icon name="book-open-variant" size={32} color="#94A3B8" />
                </View>
                <View style={styles.articleInfo}>
                  <Text style={styles.articleTitle}>{article.title}</Text>
                  <View style={styles.articleMeta}>
                    <Text style={styles.metaText}>{article.category}</Text>
                    <Text style={styles.metaText}> • </Text>
                    <Text style={styles.metaText}>{article.read_time_minutes} min read</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  categoryScroll: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8 },
  activeChip: { backgroundColor: '#1A7FD4' },
  categoryText: { color: '#64748B', fontWeight: '500' },
  activeText: { color: '#fff' },
  list: { padding: 16 },
  articleCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  articleImagePlaceholder: { height: 120, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  articleInfo: { padding: 16 },
  articleTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  articleMeta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, color: '#64748B' },
});
