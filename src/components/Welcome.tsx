import styles from './Welcome.module.css';

export function Welcome() {
  return (
    <section id="sobre" className={styles.welcome}>
      <h1 className={styles.title}>BEM VINDOS,</h1>
      <h2 className={styles.subtitle}>por favor, tirem os sapatos.</h2>
      <p className={styles.description}>
        monalisa é um espaço de depilação a laser e serviços estéticos pensado para pessoas LGBT+,
        <br />
        com atendimento acolhedor e uma experiência descontraída e divertida.
      </p>
    </section>
  );
}
