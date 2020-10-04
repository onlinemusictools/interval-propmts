import React, { Component } from 'react';
import Teoria from 'teoria';
import Vex from 'vexflow';
import './App.css';

const C4 = 60; // "C4" in midi to start us off
const LOWEST = 57; // A3
const HIGHEST = 72; // C5
const verbose = [
  'unison', // unused
  'minor second',
  'major second',
  'minor third',
  'major third',
  'perfect fourth',
  'tritone',
  'perfect fifth',
  'minor sixth',
  'major sixth',
  'minor seventh',
  'major seventh',
  'perfect octave',
];

const short = [
  'P1', // unused
  'm2',
  'M2',
  'm3',
  'M3',
  'P4',
  'A4',
  'P5',
  'm6',
  'M6',
  'm7',
  'M7',
  'P8',
];

const iOS = !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);

let n1, n2, semitones, notes, svg;

function getCount() {
  return null;
}
function getQuestion(i) {
  
  const vf = new Vex.Flow.Factory({
    renderer: {elementId: '_vex', width: 150, height: 220}
  });
  const score = vf.EasyScore();
  const system = vf.System();
  
  try {
    const clef = 'treble';
    if (!n1) {
      n1 = Teoria.note.fromMIDI(C4);
    } else {
      n1 = n2;
    }
    const nextMidi = next(n1.midi());
    semitones = Math.abs(nextMidi - n1.midi());
    n2 = n1.interval(
      nextMidi > n1.midi() 
        ? short[semitones] 
        : short[semitones][0] + '-' + short[semitones][1]
    );
    notes = [n1, n2];
    const voices = notes.slice().reverse().map(note =>
      score.voice(score.notes(note.toString().replace('x', '##') + '/w', {clef}))
    );
    system.addStave({voices}).addClef(clef);
    vf.draw();
  } catch(_){
    return getQuestion();
  }
  svg = <div dangerouslySetInnerHTML={{__html: vf.context.svg.outerHTML}} />;
  return (
    <div>
      Press the "{iOS ? 'play question' : '▶ question'}" button to
      hear the start note, than sing a 
      <h3>
        {verbose[semitones]}
        {' '}
        {n2.midi() > n1.midi() ? 'above' : 'below'}
      </h3>
      Press the "flip" button for more interval info.
    </div>
  );
}

function getAnswer(i) {
  return (
    <div>
      {pretty(n1)} to {pretty(n2)} is a {verbose[semitones]}
      {' '}
      ({semitones === 6 ? 'TT' : short[semitones]})
      {svg}
    </div>
  );
}

function next(x) {
  const min = Math.max(LOWEST, x - 12);
  const max = Math.min(HIGHEST, x + 12);
  const y = Math.floor(Math.random() * (max - min + 1)) + min;
  return y === x ? next(x) : y;
}


function getAudio() {  
  const notesCopy = [].concat(notes, notes.slice().reverse()); // up and down
  return notesCopy.map(note => 
    new Audio('samples/' + getFileNote(note) + '.mp3')
  );
}

function getNormalNote(note) {
  if (note.accidentalValue() === 0) { // no sharp, nor flats
    return note.toString().toUpperCase();
  }
  if (note.accidentalValue() === 1) { // sharp
    return note.toString().replace('#', '-').toUpperCase();
  }
  return null;
}

function getFileNote(note) {
  const res = getNormalNote(note) || getNormalNote(note.enharmonics()[0]) || getNormalNote(note.enharmonics()[1]);
  return res.replace('E-', 'F').replace('B-', 'C');
}

function pretty(note) {
  return note.name().toUpperCase() + 
    note.accidental()
      .replace(/#/g, '♯')
      .replace(/b/g, '♭')
      .replace('x', '𝄪');
}
// the actual quiz is done, boring stuff follows...

class App extends Component {
  constructor() {
    super();
    this.state = {
      question: getQuestion(1),
      answer: getAnswer(1),
      total: getCount(),
      i: 1,
      audio: getAudio(1),
      pause: false,
      playingNote: -1,
    };
    window.addEventListener('keydown', (e) => {
      // space bar
      if (e.keyCode === 49 || e.charCode === 49) {
        e.preventDefault();
        this.playQuestion();
      }
      // p and P
      if (e.keyCode === 50 || e.charCode === 50) {
        e.preventDefault();
        this.playAnswer();
      }
      // right arrow
      if (e.keyCode === 39 || e.charCode === 39) {
        e.preventDefault();
        this.nextQuestion();
      }
      // n and N
      if (e.keyCode === 110 || e.charCode === 110 || e.keyCode === 78 || e.charCode === 78) {
        e.preventDefault();
        this.nextQuestion();
      }
    });
  }
  
  nextQuestion() {
    this.pause();
    this.setState({
      question: getQuestion(this.state.i + 1),
      answer: getAnswer(this.state.i + 1),
      i: this.state.i + 1,
      audio: getAudio(this.state.i + 1),
      playingNote: -1,
    });
  }
  
  pause() {    
    for (const note of this.state.audio) {
      note.pause();
      note.currentTime = 0;
    }
    this.setState({pause: true});
  }

  playQuestion() {
    this.pause();
    this.setState({pause: false, playingNote: -1});
    this.state.audio[0].play();
  }
  
  playAnswer() {
    this.pause();
    this.setState({pause: false, playingNote: -1});
    this.state.audio[1].play();
  }
  
  render() {
    return (
      <div>
        {
          this.state.total 
            ? <Count i={this.state.i} total={this.state.total} />
            : null
        }
        <Flashcard
          id={this.state.i}
          question={this.state.question}
          answer={this.state.answer}
        />
        <button 
          className="playButton" 
          onMouseDown={this.playQuestion.bind(this)}>
          {iOS ? 'play question' : '▶ question'}
        </button>
        {' '}
        <button 
          className="playButton" 
          onMouseDown={this.playAnswer.bind(this)}>
          {iOS ? 'play answer' : '▶ answer'}
        </button>
        {' '}        
        {
          (this.state.total && this.state.i >= this.state.total)
            ? null
            : <button 
                className="nextButton" 
                onClick={this.nextQuestion.bind(this)}>
                next...
              </button>
        }
      </div>
    );
  }
}

class Flashcard extends Component {

  constructor(props) {
    super();
    this.state = {
      reveal: false,
      id: props.id,
    };
    window.addEventListener('keydown', (e) => {
      // arrows
      if (e.keyCode === 38 || e.charCode === 38 || e.keyCode === 40 || e.charCode === 40) {
        this.flip();
      }
      // f and F
      if (e.keyCode === 102 || e.charCode === 102 || e.keyCode === 70 || e.charCode === 70) {
        this.flip();
      }
    });
  }

  static getDerivedStateFromProps(props, state) {
    if (props.id !== state.id) {
      return {
        reveal: false,
        id: props.id,
      };
    }
    return null;
  }

  flip() {
    this.setState({
      reveal: !this.state.reveal,
    });
  }

  render() {
    const className = "card flip-container" + (this.state.reveal ? ' flip' : '');
    return (
      <div><center>
        <div className={className} onClick={this.flip.bind(this)}>
          <div className="flipper">
            <div className="front" style={{display: this.state.reveal ? 'none' : ''}}>
              {this.props.question}
            </div>
            <div className="back" style={{display: this.state.reveal ? '' : 'none'}}>
              {this.props.answer}
            </div>
          </div>
        </div>
        <button className="answerButton" onClick={this.flip.bind(this)}>flip</button>
      </center></div>
    );
  }
}

const Count = ({i, total}) =>
  <div>
    Question {i} / {total}
  </div>;

export default App;

