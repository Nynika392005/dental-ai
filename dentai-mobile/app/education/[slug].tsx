import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../lib/api';

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticle();
  }, [slug]);

  const loadArticle = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/education/articles/${slug}`);
      setArticle(res.data);
    } catch (e) {
      console.log('Error loading article', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1A7FD4" />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.center}>
        <Text>Article not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{article.title}</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{article.category.toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>{article.title}</Text>
        
        <View style={styles.meta}>
          <Text style={styles.metaText}>By {article.author}</Text>
          <Text style={styles.metaText}> • </Text>
          <Text style={styles.metaText}>{article.read_time_minutes} min read</Text>
        </View>

        <View style={styles.divider} />
        
        <Text style={styles.articleContent}>{article.content}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0' 
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', flex: 1, marginHorizontal: 16, textAlign: 'center' },
  content: { padding: 20 },
  categoryBadge: { 
    backgroundColor: '#EFF6FF', 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderRadius: 4, 
    alignSelf: 'flex-start', 
    marginBottom: 12 
  },
  categoryText: { fontSize: 12, fontWeight: 'bold', color: '#1A7FD4' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  meta: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  metaText: { fontSize: 14, color: '#64748B' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 24 },
  articleContent: { fontSize: 16, lineHeight: 28, color: '#334155' },
  backBtn: { marginTop: 20, padding: 12, backgroundColor: '#1A7FD4', borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: 'bold' }
});
