import React, {useCallback, useState, useEffect} from 'react';
import {View, TextInput, StyleSheet, Text, Image} from 'react-native';
import {searchQuery} from '../services/api';
import {FlashList} from '@shopify/flash-list';
import SkeletonContent from 'react-native-skeleton-content';

type ISearchBar = {
  searchValue: string;
  setSearchValue: (value: string) => void;
};

type ISearchItem = {
  avatar: string;
  color: string;
  id: number;
  name: string;
  type: string;
};

const SearchBar = ({
  searchValue = '',
  setSearchValue = () => {},
}: ISearchBar) => {
  const [autoComplete, setAutoComplete] = useState<ISearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );

  const beginSearch = useCallback(async () => {
    if (!searchValue.trim()) {
      return;
    }

    setLoading(true);

    try {
      console.log('triggered search for:', searchValue);
      const response = await searchQuery(searchValue, 8, 1);
      setAutoComplete(response?.autocomplete || []);
      console.log('autocomplete: ', autoComplete);
    } catch (e) {
      console.error('Error fetching autocomplete data:', e);
    } finally {
      setLoading(false);
    }
  }, [searchValue]);

  useEffect(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    const timeout = setTimeout(() => {
      beginSearch();
    }, 500);
    setDebounceTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [searchValue, beginSearch]);

  return (
    <View>
      <TextInput
        value={searchValue}
        style={styles.input}
        onChangeText={searchText => {
          console.log('search text: ' + searchText);
          setSearchValue(searchText);
        }}
        placeholder="Search for interests..."
      />
      <View style={styles.searchResult}>
        {loading ? (
          <SkeletonContent
            containerStyle={styles.skeletonContent}
            isLoading={loading}
            layout={[
              {width: '90%', height: 50, marginBottom: 10, borderRadius: 8},
              {width: '80%', height: 50, marginBottom: 10, borderRadius: 8},
              {width: '95%', height: 50, marginBottom: 10, borderRadius: 8},
            ]}
          />
        ) : (
          <FlashList
            data={autoComplete.reverse()}
            keyExtractor={item => item.id.toString()}
            renderItem={({item}) => {
              console.log('rendering item', item);
              return (
                <View style={styles.itemsContainer}>
                  <Image
                    style={styles.itemImage}
                    source={{uri: item?.avatar}}
                  />
                  <Text style={[styles.itemName, {color: item?.color}]}>
                    {item?.name}
                  </Text>
                </View>
              );
            }}
            estimatedItemSize={100}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 40,

    marginHorizontal: 10,
    // borderTopEndRadius: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFF',
  },
  skeletonContent: {
    flex: 1,
    width: '100%',
  },
  searchResult: {
    height: '80%',
    marginBottom: 10,
    marginHorizontal: 10,
    // borderTopEndRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFF',
  },
  itemsContainer: {
    flexDirection: 'row',
    marginVertical: 3,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  itemImage: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    marginRight: 10,
  },
  itemName: {
    // color: '#000',
  },
});

export default SearchBar;
