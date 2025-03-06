import React, {useCallback, useState, useEffect} from 'react';
import {View, TextInput, StyleSheet, Text, Image, FlatList} from 'react-native';
import {searchQuery} from '../services/api';
import {Skeleton} from './Skeleton';
import {all} from 'axios';

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
  secondaryTerm?: string;
};

const SearchBar = ({
  searchValue = '',
  setSearchValue = () => {},
}: ISearchBar) => {
  const [autoComplete, setAutoComplete] = useState<ISearchItem[]>([]);
  const [allResults, setAllResults] = useState<ISearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );

  const beginSearch = useCallback(async () => {
    if (!searchValue.trim()) {
      setAutoComplete([]);
      return;
    }

    setLoading(true);

    try {
      console.log('triggered search for:', searchValue);
      const response = await searchQuery(searchValue, 8, 1);
      const fetchedResults = response?.autocomplete || [];

      setAllResults(fetchedResults);
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
      if (allResults.length > 0) {
        const filteredResults = allResults.filter(
          item =>
            item.name.toLowerCase().startsWith(searchValue.toLowerCase()) ||
            (item.secondaryTerm
              ?.toLowerCase()
              .startsWith(searchValue.toLowerCase()) ??
              false),
        );
        setAutoComplete(filteredResults);
      } else {
        beginSearch();
      }
    }, 250);
    setDebounceTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [searchValue, beginSearch, allResults]);

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
          <View>
            {[...Array(5)].map((_, index) => (
              <View key={index} style={styles.skeletonContainer}>
                <Skeleton width={40} height={40} borderRadius={20} />
                <Skeleton
                  width="70%"
                  height={20}
                  borderRadius={4}
                  style={styles.skeletonText}
                />
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={autoComplete.slice().reverse()} // Show from bottom to top
            keyExtractor={item => item.id.toString()}
            inverted // Ensures list scrolls from bottom
            style={styles.flatlistContent}
            renderItem={({item}) => {
              console.log('rendering item', item);
              return (
                <View style={styles.itemsContainer}>
                  <Image
                    style={styles.itemImage}
                    source={{uri: item?.avatar}}
                  />
                  <View>
                    <Text style={[styles.itemName, {color: item?.color}]}>
                      {item?.name}
                    </Text>
                    {item.secondaryTerm && (
                      <Text style={styles.secondaryTerm}>
                        {item.secondaryTerm}
                      </Text>
                    )}
                  </View>
                </View>
              );
            }}
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
  flatlistContent: {
    flexGrow: 1,
  },
  searchResult: {
    height: 'auto',
    marginBottom: 10,
    marginHorizontal: 10,
    // borderTopEndRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFF',
    paddingBottom: 10,
  },
  skeletonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  skeletonText: {
    marginLeft: 10,
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
  secondaryTerm: {
    fontSize: 14,
    color: '#888',
  },
});

export default SearchBar;
