import React, {useState} from 'react';
import {View, TextInput, StyleSheet, Text, Image} from 'react-native';
import {searchQuery} from '../services/api';
import {FlashList} from '@shopify/flash-list';

type ISearchBar = {
  searchValue: string;
  setSearchValue: (value: string) => void;
};

const SearchBar = ({
  searchValue = '',
  setSearchValue = () => {},
}: ISearchBar) => {
  const [autoComplete, setAutoComplete] = useState([]);

  console.log('search value: ' + searchValue);
  const beginSearch = async () => {
    console.log('triggered search');
    const response = await searchQuery(searchValue, 15, 1);
    console.log('outer response: ', response);
    setAutoComplete(response?.autocomplete);
    console.log('autocomplete: ', autoComplete);
  };

  return (
    <View>
      <TextInput
        // onKeyPress={beginSearch}
        value={searchValue}
        style={styles.input}
        onChangeText={searchText => {
          console.log('search text: ' + searchText);
          setSearchValue(searchText);
          beginSearch();
        }}
        placeholder="Search for interests..."
      />
      <View style={styles.searchResult}>
        {/* {autoComplete.map((item, index) => (
          <FlatList key={index}>{item}</FlatList>
        ))} */}
        <FlashList
          data={autoComplete}
          renderItem={({item}) => {
            console.log('rendering item', item.avatar);
            return (
              <View style={styles.itemsContainer}>
                <Image style={styles.itemImage} source={{uri: item?.avatar}} />
                <Text>{item?.name}</Text>
              </View>
            );
          }}
          estimatedItemSize={200}
        />
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
  searchResult: {
    height: 300,
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
    marginVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#000',
  },
  itemImage: {
    width: 40,
    height: 40,
  },
});

export default SearchBar;
