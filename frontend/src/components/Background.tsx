import styles from './Background.module.css'

/** The fixed gradient with three slowly drifting colour blobs behind everything. */
export function Background() {
  return (
    <div className={styles.background} aria-hidden="true">
      <span className={`${styles.blob} ${styles.blob1}`} />
      <span className={`${styles.blob} ${styles.blob2}`} />
      <span className={`${styles.blob} ${styles.blob3}`} />
    </div>
  )
}
