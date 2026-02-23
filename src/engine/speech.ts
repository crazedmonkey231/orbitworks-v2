export interface SpeechParams {
  lang: string;
  pitch: number;
  rate: number;
  voice?: SpeechSynthesisVoice | null;
}

export interface SpeechState {
  transcriptHistory: string[];
  speechParams: SpeechParams;
}

export class SpeechManager {
  private synth: SpeechSynthesis;
  private recongition: SpeechRecognition;
  private speechParams: SpeechParams = {
    lang: "en-US",
    pitch: 1.0,
    rate: 1.25,
    voice: null
  };
  private speech: SpeechSynthesisUtterance;
  private transcriptHistory: string[] = [];

  constructor(speechParams?: Partial<SpeechParams>) {
    this.synth = window.speechSynthesis;
    this.recongition = new SpeechRecognition();
    this.recongition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      this.transcriptHistory.push(transcript);
    };
    this.speech = new SpeechSynthesisUtterance();
    if (speechParams) {
      this.speechParams = { ...this.speechParams, ...speechParams };
    }
  }

  getTranscriptHistory() {
    return this.transcriptHistory;
  }

  getRecentTranscript() {
    return this.transcriptHistory.length > 0 ? this.transcriptHistory[this.transcriptHistory.length - 1] : "";
  }

  speak(text: string) {
    if (this.synth) {
      this.speech.text = text;
      this.speech.lang = this.speechParams.lang;
      this.speech.pitch = this.speechParams.pitch;
      this.speech.rate = this.speechParams.rate;
      if (this.speechParams.voice) {
        this.speech.voice = this.speechParams.voice;
      } else {
        const voices = this.synth.getVoices();
        if (voices.length > 0) {
          this.speech.voice = voices[0];
        }
      }
      this.synth.speak(this.speech);
    }
  }

  startRecognition() {
    this.recongition.start();
  }

  stopRecognition() {
    this.recongition.stop();
  }

  saveState(): SpeechState {
    return {
      transcriptHistory: this.transcriptHistory,
      speechParams: this.speechParams
    };
  }

  loadState(state: SpeechState) {
    if (state.transcriptHistory) {
      this.transcriptHistory = state.transcriptHistory;
    }
    if (state.speechParams) {
      this.speechParams = state.speechParams;
    }
  }
}
