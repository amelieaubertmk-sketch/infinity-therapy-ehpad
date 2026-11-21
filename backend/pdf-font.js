import {readFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';

function cmapGlyphs(data,cmap){
 const offsets=[];
 for(let i=0;i<data.readUInt16BE(cmap+2);i++)offsets.push(cmap+data.readUInt32BE(cmap+8+i*8));
 const format12=offsets.find(offset=>data.readUInt16BE(offset)===12);
 if(format12!==undefined)return code=>{
  let low=0,high=data.readUInt32BE(format12+12)-1;
  while(low<=high){
   const mid=(low+high)>>1,offset=format12+16+mid*12;
   const start=data.readUInt32BE(offset),end=data.readUInt32BE(offset+4);
   if(code<start)high=mid-1;
   else if(code>end)low=mid+1;
   else return data.readUInt32BE(offset+8)+code-start;
  }
  return 0;
 };
 const format4=offsets.find(offset=>data.readUInt16BE(offset)===4);
 if(format4===undefined)throw Error('Police PDF incompatible.');
 const count=data.readUInt16BE(format4+6)/2,endCodes=format4+14,startCodes=endCodes+count*2+2,deltas=startCodes+count*2,ranges=deltas+count*2;
 return code=>{
  if(code>0xffff)return 0;
  for(let i=0;i<count;i++){
   const index=i*2;
   if(code>data.readUInt16BE(endCodes+index))continue;
   const start=data.readUInt16BE(startCodes+index);
   if(code<start)return 0;
   const delta=data.readInt16BE(deltas+index),range=data.readUInt16BE(ranges+index);
   if(!range)return (code+delta)&0xffff;
   const glyph=data.readUInt16BE(ranges+index+range+(code-start)*2);
   return glyph?(glyph+delta)&0xffff:0;
  }
  return 0;
 };
}

function font(file,name=file){
 const data=readFileSync(new URL('../assets/fonts/'+file+'.ttf',import.meta.url)),tables={};
 for(let i=0;i<data.readUInt16BE(4);i++){
  const at=12+i*16;
  tables[data.toString('ascii',at,at+4)]=data.readUInt32BE(at+8);
 }
 const units=data.readUInt16BE(tables.head+18),metrics=data.readUInt16BE(tables.hhea+34);
 const scale=v=>Math.round(v*1000/units);
 const glyph=cmapGlyphs(data,tables.cmap),faceScale=code=>scale(data.readUInt16BE(tables.hmtx+Math.min(glyph(code),metrics-1)*4));
 const bbox=[36,38,40,42].map(offset=>scale(data.readInt16BE(tables.head+offset))).join(' ');
 return {name,data,glyph,width:faceScale,bbox,ascent:scale(data.readInt16BE(tables.hhea+4)),descent:scale(data.readInt16BE(tables.hhea+6))};
}

const faces=[font('OpenSans-Regular','OpenSans'),font('OpenSans-Bold'),font('DejaVuSans'),font('DejaVuSans-Bold')];
function faceIndex(code,bold){
 const index=bold?1:0;
 return faces[index].glyph(code)?index:index+2;
}
export function measuredWidth(value,size=10,bold=false){
 return [...value].reduce((width,char)=>{
  const code=char.codePointAt(0);
  return width+faces[faceIndex(code,bold)].width(code)*size/1000;
 },0);
}
const unicodeHex=value=>Buffer.from(value,'utf16le').swap16().toString('hex');
const cidHex=cid=>cid.toString(16).padStart(4,'0');
function addFont(add,face,characters){
 const stream=bytes=>add(Buffer.concat([Buffer.from(`<< /Length ${bytes.length} >>\nstream\n`),bytes,Buffer.from('\nendstream')]));
 let mappings='';
 for(let i=1;i<characters.length;i+=100){
  const block=characters.slice(i,i+100);
  mappings+=block.length+' beginbfchar\n'+block.map((char,j)=>`<${cidHex(i+j)}> <${unicodeHex(char)}>`).join('\n')+'\nendbfchar\n';
 }
 const unicode=stream(Buffer.from('/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /AssessmentUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n'+mappings+'endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend'));
 const zipped=deflateSync(face.data);
 const file=add(Buffer.concat([Buffer.from(`<< /Length ${zipped.length} /Length1 ${face.data.length} /Filter /FlateDecode >>\nstream\n`),zipped,Buffer.from('\nendstream')]));
 const descriptor=add(`<< /Type /FontDescriptor /FontName /${face.name} /Flags 32 /FontBBox [${face.bbox}] /ItalicAngle 0 /Ascent ${face.ascent} /Descent ${face.descent} /CapHeight 730 /StemV 80 /FontFile2 ${file} 0 R >>`);
 const map=Buffer.alloc(characters.length*2),widths=[0];
 characters.slice(1).forEach((char,i)=>{
  const code=char.codePointAt(0);
  map.writeUInt16BE(face.glyph(code),(i+1)*2);
  widths.push(face.width(code));
 });
 const gid=stream(map);
 const descendant=add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${face.name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /W [0 [${widths.join(' ')}]] /CIDToGIDMap ${gid} 0 R >>`);
 return add(`<< /Type /Font /Subtype /Type0 /BaseFont /${face.name} /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${unicode} 0 R >>`);
}
export function pdfFonts(){
 // Use the original font only for characters outside Open Sans coverage.
 const maps=faces.map(()=>new Map()),characters=faces.map(()=>['']);
 const encode=(value,bold=false)=>{
  const runs=[];
  for(const char of value){
   const code=char.codePointAt(0),index=faceIndex(code,bold),face=faces[index],map=maps[index];
   if(!face.glyph(code))throw Error('Caractère non pris en charge dans le PDF : utiliser une transcription lisible.');
   if(!map.has(char)){
    map.set(char,characters[index].length);
    characters[index].push(char);
   }
   if(runs.at(-1)?.index!==index)runs.push({index,hex:'',width:0});
   const run=runs.at(-1);
   run.hex+=cidHex(map.get(char));
   run.width+=face.width(code);
  }
  return runs;
 };
 const build=add=>faces.flatMap((face,i)=>characters[i].length>1?[`/F${i} ${addFont(add,face,characters[i])} 0 R`]:[]).join(' ');
 return {encode,build};
}
