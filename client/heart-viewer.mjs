import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export async function mountHeart(stage,{onPick,onReady,onError,onViewChange,localModelURL,components,visibleIds,signal,modelLabel='heart'}={}){
 let disposed=false,frame=0,renderer,model,selected=null;const meshes=[];let parts=visibleIds?new Set(visibleIds):null;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.05,100);camera.position.set(0,.2,6.5);
 try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;stage.append(renderer.domElement);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();onError?.('3D rendering was interrupted. Retry the model to continue. Your completed activity is saved.')})}catch(e){onError?.('3D rendering is unavailable on this device. You can still read all structure notes below.');return {dispose(){},select(){},setView(){},showAll(){},setOpacity(){},isolate(){},setQuiz(){},setParts(){}}}
 renderer.domElement.setAttribute('aria-label','Interactive '+modelLabel+'. Drag to rotate, pinch to zoom. Arrow keys rotate; plus and minus zoom; Enter selects the highlighted candidate.');renderer.domElement.tabIndex=0;
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=2;controls.maxDistance=12;controls.enablePan=true;scene.add(new THREE.HemisphereLight(0xffffff,0x35405a,2));const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(4,6,5);scene.add(key);const fill=new THREE.DirectionalLight(0xb8d7ff,1.8);fill.position.set(-4,1,-3);scene.add(fill);
 function render(){if(disposed||frame)return;frame=requestAnimationFrame(()=>{frame=0;if(!disposed)renderer.render(scene,camera)})}
 let programmatic=false;controls.addEventListener('change',()=>{if(!programmatic)onViewChange?.('custom');render()});const resize=new ResizeObserver(()=>{const width=Math.max(1,stage.clientWidth),height=Math.max(1,stage.clientHeight);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();render()});resize.observe(stage);
 let down=null,keyboardIndex=0,quizTarget=null;
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)return;const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(meshes.filter(m=>m.visible&&m.material.opacity>.2),false)[0];if(hit)onPick?.(hit.object.userData.structure)});
 renderer.domElement.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home','[',']','Enter'].includes(e.key))e.preventDefault();if(e.key==='Home')setView('anterior');else if(e.key==='+'||e.key==='-'){camera.position.sub(controls.target).multiplyScalar(e.key==='+'?.9:1.1).add(controls.target);controls.update()}else if(e.key.startsWith('Arrow')){const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));s.theta+=(e.key==='ArrowLeft'?-.16:e.key==='ArrowRight'?.16:0);s.phi=Math.max(.1,Math.min(Math.PI-.1,s.phi+(e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0)));camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(controls.target));controls.update()}else if(e.key==='['||e.key===']'){const candidates=meshes.filter(m=>m.visible);keyboardIndex=(keyboardIndex+(e.key===']'?1:-1)+candidates.length)%candidates.length;select(candidates[keyboardIndex]?.userData.structure)}else if(e.key==='Enter'){const chosen=meshes.find(m=>m.visible&&m.userData.structure===selected)||meshes.find(m=>m.visible);if(chosen)onPick?.(chosen.userData.structure)};render()});
 function select(id,highlightIds=[id]){selected=id;const highlighted=new Set(highlightIds);for(const mesh of meshes){const chosen=highlighted.has(mesh.userData.structure);mesh.material.emissive.set(chosen?0x947214:0x000000);mesh.material.emissiveIntensity=chosen?.55:0}render()}
 function showAll(){for(const m of meshes)m.visible=!parts||parts.has(m.userData.structure);render()}
 function setParts(ids){parts=ids?new Set(ids):null;keyboardIndex=0;showAll()}
 function setOpacity(value){for(const m of meshes){const adjustable=modelLabel!=='heart'||/atrium|wall/.test(m.userData.structure),opacity=adjustable?value:1;m.material.transparent=opacity<1;m.material.opacity=opacity;m.material.depthWrite=opacity>=1}render()}
 function isolate(ids){const subset=new Set(Array.isArray(ids)?ids:[ids]);for(const mesh of meshes)mesh.visible=subset.has(mesh.userData.structure)&&(!parts||parts.has(mesh.userData.structure));render()}
 function setView(view,visibleOnly=false){const positions={anterior:[0,.1,6.5],posterior:[0,.1,-6.5],left:[6.5,.1,0],right:[-6.5,.1,0],superior:[0,6.5,.01]};programmatic=true;const bounds=new THREE.Box3();for(const m of meshes)if(visibleOnly?m.visible:!parts||parts.has(m.userData.structure))bounds.expandByObject(m);const center=bounds.isEmpty()?new THREE.Vector3():bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());const fit=Math.max(modelLabel==='heart'?2.4:.16,size.length()*1.45,Math.max(size.x,size.z)*1.3/Math.min(1,camera.aspect));controls.minDistance=modelLabel==='heart'?2:Math.min(2,fit*.30);controls.maxDistance=Math.max(12,fit*2);camera.position.set(...(positions[view]||positions.anterior)).normalize().multiplyScalar(fit).add(center);controls.target.copy(center);controls.update();programmatic=false;onViewChange?.(view);render()}
 function setQuiz(id,highlight){quizTarget=id;showAll();setOpacity(id==='ventricular-wall'?1:.17);if(id.includes('atrium'))for(const m of meshes)if(m.userData.structure.includes('atrium')){m.material.opacity=.85;m.material.transparent=true;m.material.depthWrite=false}if(highlight)for(const m of meshes)if(m.userData.structure===id){m.material.opacity=1;m.material.transparent=false;m.material.depthWrite=true}select(highlight?id:null)}
 async function loadComponent({url,key,scale=1,offset=[0,0,0],omit=[]}){
  const response=await fetch(url,{credentials:'same-origin',signal});
  if(!response.ok)throw Error(response.status===401?'Sign in to load your private model.':'The model could not be loaded. Retry to reload it.');
  let bytes=await response.arrayBuffer();
  const signature=new Uint8Array(bytes,0,Math.min(2,bytes.byteLength));
  if(signature[0]===31&&signature[1]===139)bytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const gltf=await new GLTFLoader().parseAsync(bytes,'');
  const component=gltf.scene;
  component.scale.setScalar(scale);component.position.set(...offset);
  const omitted=new Set(omit), skipped=[];
  component.traverse(mesh=>{
   if(!mesh.isMesh)return;
   let parent=mesh;while(parent&&!parent.name)parent=parent.parent;
   const id=mesh.name||parent?.name;
   if(omitted.has(id)){skipped.push(mesh);return;}
   mesh.userData.structure=key?key+'/'+id:id;
   mesh.material=mesh.material.clone();
   const palette={tricuspid:0xd09a5c,mitral:0x8cb7bd,pulmonary:0x9c83c9,aortic:0xe8bf79,rv:0xb87783,lv:0xb87783};
   const tint=modelLabel==='heart'||key==='heart'?palette[id.split('-')[0]]:undefined;
   if(tint!==undefined&&/leaflet|papillary|^(aortic|pulmonary)-(?!arch$|trunk$)/.test(id))mesh.material.color.set(tint);
   mesh.material.side=THREE.DoubleSide;meshes.push(mesh);
  });
  for(const mesh of skipped)mesh.removeFromParent();
  return component;
 }
 try{
  model=new THREE.Group();
  const sources=components||[{url:localModelURL||'/api/study-assets/heart-v1'}];
  for(const source of sources){
   const component=await loadComponent(source);
   if(disposed||signal?.aborted)break;
   model.add(component);
  }
  if(disposed||signal?.aborted){for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();}}
  else{
   const box=new THREE.Box3().setFromObject(model);
   model.position.sub(box.getCenter(new THREE.Vector3()));
   scene.add(model);showAll();onReady?.(meshes.map(mesh=>mesh.userData.structure));render();
  }
 }catch(e){if(!signal?.aborted)onError?.(e.message);}

 return {select,setView,showAll,setOpacity,isolate,setQuiz,setParts,dispose(){disposed=true;cancelAnimationFrame(frame);resize.disconnect();controls.dispose();for(const m of meshes){m.geometry.dispose();m.material.dispose()}renderer.dispose();renderer.domElement.remove()}};
}
