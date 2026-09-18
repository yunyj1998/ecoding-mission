'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

// Original procedural suspense bed: no sampled recording or borrowed melody.
export function useMissionMusic(running:boolean,run:number|undefined){
  const [enabled,setEnabled]=useState(false);
  const audio=useRef<AudioContext|null>(null),bus=useRef<GainNode|null>(null);
  const enable=useCallback(()=>{
    try {
      audio.current??=new AudioContext();
      if(!bus.current){bus.current=audio.current.createGain();bus.current.gain.value=.045;bus.current.connect(audio.current.destination)}
      void audio.current.resume().then(()=>setEnabled(true)).catch(()=>setEnabled(false));
    }catch{setEnabled(false)}
  },[]);
  const toggle=()=>{if(enabled)setEnabled(false);else enable()};
  useEffect(()=>{
    const ctx=audio.current,gain=bus.current;if(!ctx||!gain)return;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(running && enabled ? .045 : 0,ctx.currentTime,.12);
    if(!running||!enabled)return;
    let step=0;const nodes=new Set<OscillatorNode>();
    const pulse=()=>{
      if(document.hidden||ctx.state!=='running')return;
      const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
      const bass=[55,55,65.406,55,73.416,55,61.735,55];
      o.type='triangle';o.frequency.value=bass[step++%bass.length];
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.7,t+.04);g.gain.exponentialRampToValueAtTime(.001,t+.65);
      o.connect(g);g.connect(gain);o.start(t);o.stop(t+.7);nodes.add(o);
      o.onended=()=>{nodes.delete(o);o.disconnect();g.disconnect()};
    };
    pulse();const interval=setInterval(pulse,720);
    return()=>{clearInterval(interval);gain.gain.setTargetAtTime(0,ctx.currentTime,.05);for(const o of nodes){try{o.stop()}catch{}}};
  },[running,run,enabled]);
  useEffect(()=>()=>{void audio.current?.close()},[]);
  return {enabled,enable,toggle};
}
