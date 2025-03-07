import React, {useState} from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';

import SearchBar from './src/components/SearchBar';

function App(): React.JSX.Element {
  const [searchValue, setSearchValue] = useState('');

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle={'light-content'} />
      <View style={styles.searchContainer}>
        <SearchBar searchValue={searchValue} setSearchValue={setSearchValue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    paddingTop: 30,
    backgroundColor: '#F2F2F2',
    flex: 1,
  },
  searchContainer: {
    borderColor: '#F9F9F9',
  },
});

export default App;
