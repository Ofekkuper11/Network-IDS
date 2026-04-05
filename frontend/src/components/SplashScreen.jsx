import styles from './SplashScreen.module.css';

export default function SplashScreen() {
  return (
    <div className={styles.root} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.inner}>
        <div className={styles.titleWrap}>
          <h1 className={styles.glitchTitle} data-glitch="IDS Dashboard">
            IDS Dashboard
          </h1>
        </div>
        <p className={styles.subtitle}>Initializing detection modules...</p>
        <div className={styles.spinnerWrap} aria-hidden>
          <div className={styles.ring} />
        </div>
      </div>
    </div>
  );
}
