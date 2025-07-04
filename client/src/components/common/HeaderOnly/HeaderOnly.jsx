import React from 'react';
import Header from '../Header';
import styles from '../Fixed/Fixed.module.scss';

const HeaderOnly = () => (
  <div className={styles.wrapper}>
    <Header />
  </div>
);

export default HeaderOnly;
