// Reconcile calculation output without replacing focused inputs. Keeping the
// native control alive preserves caret, selection, number drafts (0., -), and IME.
const key=n=>{
 if(n.nodeType!==1)return `#${n.nodeType}`;
 if(n.id)return `${n.tagName}#${n.id}`;
 if(n.dataset.path)return `${n.tagName}:path:${n.dataset.path}`;
 if(n.tagName==='LABEL'){const field=n.querySelector('[data-path]');if(field)return `LABEL:${field.dataset.path}`;}
 for(const k of ['pipeEdit','rackRemovePipe','boltTier','tab','action'])if(n.dataset[k]!==undefined)return `${n.tagName}:${k}:${n.dataset[k]}:${n.dataset.boltEnd||''}`;
 return `${n.tagName}.${n.classList[0]||''}`;
};
function sync(current,next,active){
 if(current.nodeType!==1){if(current.nodeValue!==next.nodeValue)current.nodeValue=next.nodeValue;return;}
 const editing=current===active,control=['INPUT','TEXTAREA','SELECT'].includes(current.tagName);
 for(const a of [...current.attributes])if(!next.hasAttribute(a.name)&&!(editing&&a.name==='value'))current.removeAttribute(a.name);
 for(const a of [...next.attributes])if(!(editing&&a.name==='value')&&current.getAttribute(a.name)!==a.value)current.setAttribute(a.name,a.value);
 if(current.tagName==='INPUT'){if(!editing&&current.value!==next.value)current.value=next.value;current.checked=next.checked;return;}
 if(current.tagName==='TEXTAREA'){if(!editing&&current.value!==next.value)current.value=next.value;return;}
 children(current,next,active);
 if(control&&!editing&&current.value!==next.value)current.value=next.value;
}
function children(current,next,active){
 const available=[...current.childNodes];let anchor=current.firstChild;
 for(const child of [...next.childNodes]){
  const k=key(child),index=available.findIndex(n=>key(n)===k);
  if(index<0){current.insertBefore(child.cloneNode(true),anchor);continue;}
  const node=available.splice(index,1)[0];
  // Unchanged input paths keep their ancestor chain and native input element.
  if(node!==anchor)current.insertBefore(node,anchor);
  sync(node,child,active);anchor=node.nextSibling;
 }
 for(const node of available)node.remove();
}
export function patchContent(root,html){const template=document.createElement('template');template.innerHTML=html;children(root,template.content,document.activeElement);}
