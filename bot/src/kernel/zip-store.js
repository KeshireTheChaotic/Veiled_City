/** Generic stored ZIP encoding; callers own filenames, content and audience. */
import {Buffer} from 'node:buffer';
function crc32(buf){
  let c=0xffffffff;
  for(const b of buf){
    c^=b;
    for(let k=0;k<8;k++) c=(c>>>1)^((c&1)?0xedb88320:0);
  }
  return (c^0xffffffff)>>>0;
}
function dosStamp(date=new Date()){
  const y=Math.max(1980,date.getFullYear());
  const time=(date.getHours()<<11)|(date.getMinutes()<<5)|(Math.floor(date.getSeconds()/2));
  const day=((y-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  return {time,day};
}
function u16(v){const b=Buffer.alloc(2);b.writeUInt16LE(v&0xffff);return b;}
function u32(v){const b=Buffer.alloc(4);b.writeUInt32LE(v>>>0);return b;}
export function zipStore(entries){
  const locals=[],centrals=[]; let offset=0; const stamp=dosStamp();
  for(const [name,value] of entries){
    const n=Buffer.from(name,"utf8"), data=Buffer.isBuffer(value)?value:Buffer.from(value,"utf8"), crc=crc32(data);
    const local=Buffer.concat([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.day),u32(crc),u32(data.length),u32(data.length),u16(n.length),u16(0),n,data]);
    locals.push(local);
    const central=Buffer.concat([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.day),u32(crc),u32(data.length),u32(data.length),u16(n.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),n]);
    centrals.push(central); offset+=local.length;
  }
  const centralOffset=offset, centralBuf=Buffer.concat(centrals);
  const end=Buffer.concat([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(centralBuf.length),u32(centralOffset),u16(0)]);
  return Buffer.concat([...locals,centralBuf,end]);
}
