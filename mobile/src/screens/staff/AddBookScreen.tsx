import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { errorMessage } from '../../api/client';
import { api } from '../../api/endpoints';
import { Button, Card, ErrorBanner, Input, Screen } from '../../components/ui';
import type { RootScreenProps } from '../../navigation/types';
import { font, spacing } from '../../theme';

export default function AddBookScreen({ navigation }: RootScreenProps<'AddBook'>) {
  const [form, setForm] = useState({
    title: '',
    authors: '',
    category: '',
    year: '',
    publisher: '',
    isbn: '',
    pages: '',
    tags: '',
    synopsis: '',
    copies: '1',
    zone: '',
    shelf: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const list = (value: string) => value.split(',').map((v) => v.trim()).filter(Boolean);
  const valid = form.title.trim() && form.authors.trim() && form.category.trim() && form.synopsis.trim().length >= 10;

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const book = await api.catalog.createBook({
        title: form.title.trim(),
        authors: list(form.authors),
        category: form.category.trim(),
        year: form.year ? Number(form.year) : undefined,
        publisher: form.publisher.trim() || undefined,
        isbn: form.isbn.trim() || undefined,
        pages: form.pages ? Number(form.pages) : undefined,
        tags: list(form.tags),
        synopsis: form.synopsis.trim(),
        initialCopies: Number(form.copies) || 0,
        zone: form.zone.trim() || undefined,
        shelf: form.shelf.trim() || undefined,
      });
      navigation.replace('BookDetail', { bookId: book.id, title: book.title });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Card>
        <Text style={[font.small, { marginBottom: spacing.md }]}>
          Al guardar, el libro se publica como evento y el servicio de IA lo indexa automáticamente para la búsqueda semántica.
        </Text>
        <ErrorBanner message={error} />
        <Input label="Título *" value={form.title} onChangeText={set('title')} />
        <Input label="Autores * (separados por coma)" value={form.authors} onChangeText={set('authors')} />
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 2, marginRight: spacing.sm }}>
            <Input label="Categoría *" value={form.category} onChangeText={set('category')} placeholder="Física" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Año" value={form.year} onChangeText={set('year')} keyboardType="number-pad" />
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 2, marginRight: spacing.sm }}>
            <Input label="Editorial" value={form.publisher} onChangeText={set('publisher')} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Páginas" value={form.pages} onChangeText={set('pages')} keyboardType="number-pad" />
          </View>
        </View>
        <Input label="ISBN" value={form.isbn} onChangeText={set('isbn')} keyboardType="number-pad" />
        <Input label="Temas (separados por coma)" value={form.tags} onChangeText={set('tags')} placeholder="principiantes, divulgación" />
        <Input label="Sinopsis * (la usa la IA para recomendar)" value={form.synopsis} onChangeText={set('synopsis')} multiline style={{ minHeight: 110, textAlignVertical: 'top' }} />
        <Text style={[font.subtitle, { marginVertical: spacing.sm }]}>Ejemplares físicos</Text>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Input label="Cantidad" value={form.copies} onChangeText={set('copies')} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 2, marginRight: spacing.sm }}>
            <Input label="Zona" value={form.zone} onChangeText={set('zone')} placeholder="Ciencias" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Estante" value={form.shelf} onChangeText={set('shelf')} placeholder="A1" autoCapitalize="characters" />
          </View>
        </View>
        <Button title="Guardar libro" icon="save-outline" onPress={save} loading={saving} disabled={!valid} />
      </Card>
    </Screen>
  );
}
