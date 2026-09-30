'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

// Procedural suspense bed. It uses Web Audio only and starts after a user gesture.
export function useMissionMusic(running:boolean,run:number|undefined){
  const [enabled,setEnabled]=useState(false);
  const audio=useRef<AudioContext|null>(null),bus=useRef<GainNode|null>(null);
  const enable=useCallback(()=>{
    try {
      const AudioCtor=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!AudioCtor)return setEnabled(false);
      audio.current??=new AudioCtor();
      if(!bus.current){bus.current=audio.current.createGain();bus.current.gain.value=0;bus.current.connect(audio.current.destination)}
      void audio.current.resume().then(()=>{
        const ctx=audio.current!;
        const tone=ctx.createOscillator(),level=ctx.createGain();
        tone.type='sine';tone.frequency.setValueAtTime(330,ctx.currentTime);
        level.gain.setValueAtTime(.001,ctx.currentTime);level.gain.exponentialRampToValueAtTime(.16,ctx.currentTime+.025);level.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.24);
        tone.connect(level);level.connect(ctx.destination);tone.start();tone.stop(ctx.currentTime+.25);
        setEnabled(true);
      }).catch(()=>setEnabled(false));
    }catch{setEnabled(false)}
  },[]);
  const toggle=()=>{if(enabled)setEnabled(false);else enable()};
  useEffect(()=>{
    const ctx=audio.current,gain=bus.current;if(!ctx||!gain)return;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(running&&enabled ? .11 : 0,ctx.currentTime,.1);
    if(!running||!enabled)return;
    let step=0;const nodes=new Set<OscillatorNode>();
    const pulse=()=>{
      if(document.hidden||ctx.state!=='running')return;
      const t=ctx.currentTime,bass=[55,55,65.406,55,73.416,55,61.735,55][step++%8];
      const make=(frequency:number,type:OscillatorType,peak:number,duration:number)=>{
        const oscillator=ctx.createOscillator(),level=ctx.createGain();
        oscillator.type=type;oscillator.frequency.value=frequency;
        level.gain.setValueAtTime(.001,t);level.gain.exponentialRampToValueAtTime(peak,t+.035);level.gain.exponentialRampToValueAtTime(.001,t+duration);
        oscillator.connect(level);level.connect(gain);oscillator.start(t);oscillator.stop(t+duration+.04);nodes.add(oscillator);
        oscillator.onended=()=>{nodes.delete(oscillator);oscillator.disconnect();level.disconnect()};
      };
      make(bass,'triangle',.85,.58);
      make(bass*2,'sine',.22,.32);
    };
    pulse();const interval=setInterval(pulse,680);
    return()=>{clearInterval(interval);gain.gain.setTargetAtTime(0,ctx.currentTime,.05);for(const oscillator of nodes){try{oscillator.stop()}catch{}}};
  },[running,run,enabled]);
  useEffect(()=>()=>{void audio.current?.close()},[]);
  return {enabled,enable,toggle};
}
