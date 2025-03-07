import React, {useCallback, useState, useEffect, useRef} from 'react';
import {View, TextInput, StyleSheet, Text, Image, FlatList} from 'react-native';
import {searchQuery} from '../services/api';
import {Skeleton} from './Skeleton';

type ISearchBar = {
  searchValue: string;
  setSearchValue: (value: string) => void;
};

type ISearchItem = {
  avatar: string | null;
  color: string;
  id: number;
  name: string;
  type: string;
  match?: number;
  existing?: boolean;
  secondaryTerm?: string;
};

const SearchBar = ({
  searchValue = '',
  setSearchValue = () => {},
}: ISearchBar) => {
  // All fetched results from API (cache)
  const [allResults, setAllResults] = useState<ISearchItem[]>([]);
  // Current filtered results to display
  const [displayResults, setDisplayResults] = useState<ISearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [pagesLeft, setPagesLeft] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Keep track of the last search term that triggered an API call
  const lastApiSearchTerm = useRef('');
  const currentSearchTerm = useRef('');
  const pendingApiCall = useRef(false);

  // Flag to prevent automatic pagination
  const userInitiatedScroll = useRef(false);

  const parseInterestName = (
    name: string,
  ): {name: string; secondaryTerm?: string} => {
    const match = name.match(/^(.+?)(?:\s*\[(.+?)\])?$/);
    if (match) {
      return {
        name: match[1].trim(),
        secondaryTerm: match[2] ? match[2].trim() : undefined,
      };
    }
    return {name};
  };

  // Fetch data from API
  const fetchFromApi = useCallback(
    async (
      term: string,
      page: number = 0,
      isBackgroundFetch: boolean = false,
    ) => {
      if (!term.trim()) {
        setDisplayResults([]);
        setAllResults([]);
        return;
      }

      if (page === 0 && !isBackgroundFetch) {
        setLoading(true);
        setDisplayResults([]);
        setAllResults([]);
      } else if (isBackgroundFetch) {
        setBackgroundLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      pendingApiCall.current = true;

      try {
        const response = await searchQuery(term, 8, page);

        if (response?.autocomplete && term === currentSearchTerm.current) {
          const processedItems = response.autocomplete.map(item => {
            const parsedName = parseInterestName(item.name);
            return {
              ...item,
              name: parsedName.name,
              secondaryTerm: parsedName.secondaryTerm,
            };
          });

          if (isBackgroundFetch) {
            // Use allResults instead of displayResults to prevent duplicates across all stored results
            const existingIds = new Set(allResults.map(item => item.id));

            // Filter out duplicates
            const uniqueNewItems = processedItems.filter(
              item => !existingIds.has(item.id),
            );

            if (uniqueNewItems.length > 0) {
              setAllResults(prev => [...prev, ...uniqueNewItems]);
              setDisplayResults(prev => [...prev, ...uniqueNewItems]);
            }
          } else if (page > 0) {
            setAllResults(prev => [...prev, ...processedItems]);
            setDisplayResults(prev => [...prev, ...processedItems]);
          } else {
            setAllResults(processedItems);
            setDisplayResults(processedItems);
          }

          setPagesLeft(response.pages_left || 0);
          lastApiSearchTerm.current = term;
        }
      } catch (e) {
        console.error('Error fetching autocomplete data:', e);
        if (page === 0 && !isBackgroundFetch) {
          setAllResults([]);
          setDisplayResults([]);
        }
      } finally {
        pendingApiCall.current = false;

        if (page === 0 && !isBackgroundFetch) {
          setLoading(false);
        } else if (isBackgroundFetch) {
          setBackgroundLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [allResults], // Depend on allResults to ensure uniqueness
  );

  // Filter existing results client-side
  const filterResultsClientSide = useCallback(
    (term: string) => {
      if (!term.trim()) {
        setDisplayResults([]);
        return false;
      }

      // Filter cached results that match the new search term
      const filtered = allResults.filter(item => {
        const nameMatches = item.name
          .toLowerCase()
          .includes(term.toLowerCase());
        const secondaryMatches = item.secondaryTerm
          ? item.secondaryTerm.toLowerCase().includes(term.toLowerCase())
          : false;
        return nameMatches || secondaryMatches;
      });

      setDisplayResults(filtered);

      // Return whether we have results
      return filtered.length > 0;
    },
    [allResults],
  );

  // Check if we should filter client-side or make an API call
  const shouldUseClientSideFilter = useCallback(
    (term: string) => {
      // If we have no previous API results, we must make an API call
      if (allResults.length === 0) {
        return false;
      }

      // If term is empty, no need for API call
      if (!term.trim()) {
        return true;
      }

      // If we have a previous search term and new term is related to it, use client filtering
      if (
        lastApiSearchTerm.current &&
        (term
          .toLowerCase()
          .startsWith(lastApiSearchTerm.current.toLowerCase()) ||
          lastApiSearchTerm.current
            .toLowerCase()
            .startsWith(term.toLowerCase()))
      ) {
        return true;
      }

      return false;
    },
    [allResults],
  );

  // Handle search input changes
  useEffect(() => {
    // Reset user scroll flag when search term changes
    userInitiatedScroll.current = false;

    // Clear any existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    // Update current search term
    currentSearchTerm.current = searchValue;

    // Reset pagination when search changes
    setCurrentPage(0);

    const timeout = setTimeout(() => {
      // If search is empty, clear results
      if (!searchValue.trim()) {
        setAllResults([]);
        setDisplayResults([]);
        return;
      }

      // Determine if we should filter client-side first
      if (shouldUseClientSideFilter(searchValue)) {
        const hasResults = filterResultsClientSide(searchValue);

        // If the new term is more specific than the last API call term
        // Make a background API call to fetch additional potential matches
        // while still showing the filtered results
        if (
          searchValue.length > lastApiSearchTerm.current.length &&
          searchValue
            .toLowerCase()
            .startsWith(lastApiSearchTerm.current.toLowerCase())
        ) {
          fetchFromApi(searchValue, 0, true);
        }
        // If filtering didn't yield enough results, make an API call
        else if (!hasResults) {
          fetchFromApi(searchValue, 0);
        }
      } else {
        // Make API call for new search
        fetchFromApi(searchValue, 0);
      }
    }, 300); // Longer debounce for better UX and fewer API calls

    setDebounceTimeout(timeout);
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [
    searchValue,
    filterResultsClientSide,
    fetchFromApi,
    shouldUseClientSideFilter,
  ]);

  // Load more results when user scrolls to the end
  const loadMoreResults = () => {
    // Only load more if:
    // 1. There are more pages to load
    // 2. We're not already loading
    // 3. User has initiated scrolling
    if (pagesLeft > 0 && !isLoadingMore && userInitiatedScroll.current) {
      setCurrentPage(prev => prev + 1);
      fetchFromApi(searchValue, currentPage + 1);
    }
  };

  // Track when user has initiated scrolling
  const handleScroll = () => {
    if (!userInitiatedScroll.current) {
      userInitiatedScroll.current = true;
    }
  };

  // ListHeaderComponent to show background loading state
  const ListHeaderComponent = useCallback(() => {
    if (backgroundLoading) {
      return (
        <View style={styles.backgroundLoadingContainer}>
          <View style={styles.skeletonContainer}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <Skeleton
              width="70%"
              height={20}
              borderRadius={4}
              style={styles.skeletonText}
            />
          </View>
        </View>
      );
    }
    return null;
  }, [backgroundLoading]);

  return (
    <View>
      <TextInput
        value={searchValue}
        style={styles.input}
        onChangeText={text => setSearchValue(text)}
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
            data={displayResults}
            keyExtractor={item => item.id.toString()}
            style={styles.flatlistContent}
            onEndReached={loadMoreResults}
            onEndReachedThreshold={0.5}
            keyboardShouldPersistTaps="handled"
            inverted
            onScroll={handleScroll}
            ListHeaderComponent={ListHeaderComponent}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.skeletonContainer}>
                  <Skeleton width={40} height={40} borderRadius={20} />
                  <Skeleton
                    width="70%"
                    height={20}
                    borderRadius={4}
                    style={styles.skeletonText}
                  />
                </View>
              ) : null
            }
            renderItem={({item}) => (
              <View style={styles.itemsContainer}>
                {item.avatar ? (
                  <Image style={styles.itemImage} source={{uri: item.avatar}} />
                ) : (
                  <View
                    style={[
                      styles.placeholderImage,
                      {backgroundColor: item.color || '#ccc'},
                    ]}
                  />
                )}
                <View style={styles.textContainer}>
                  <Text style={[styles.itemName, {color: item.color}]}>
                    {item.name}
                  </Text>
                  {item.secondaryTerm && (
                    <Text style={styles.secondaryTerm}>
                      {item.secondaryTerm}
                    </Text>
                  )}
                </View>
              </View>
            )}
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
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    marginRight: 10,
  },
  placeholderImage: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    marginRight: 10,
  },
  itemName: {
    fontWeight: '500',
  },
  secondaryTerm: {
    fontSize: 12,
    color: '#888',
    marginLeft: 5,
  },
  backgroundLoadingContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  currentSearchText: {
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 4,
  },
  loadingMoreText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SearchBar;
