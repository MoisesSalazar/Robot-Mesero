/** Servicio de voz del navegador para la simulación. */
export function speak(message: string): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
}
