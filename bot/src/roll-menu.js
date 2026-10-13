/** Restart-safe owner-private Discord roll controls backed by opaque scoped tokens. */
import { randomUUID } from "node:crypto";
import {createHash} from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,AttachmentBuilder } from "discord.js";
import { arbitrateRollOptions, discoverRollOptions } from "./roll-options.js";
import { contributeRoll } from "./roll-collaboration.js";
import { formatRollRequest, ownedRollRequest, rollRevision } from "./roll-requests.js";
import { PermissionError, StateConflictError, UserInputError } from "./errors.js";
import {finishRollOperation} from './roll-operation-publications.js';
import {splitDiscordText} from './discord/chunking.js';
import {gmRulingDetails} from './gm-action-ruling.js';

const prefix="vcr";
const custom=(token,type,action)=>`${prefix}:${token}:${type}:${action}`;
const parse=id=>{
  const [head,token,type,action,...extra]=String(id||"").split(":");
  return head===prefix&&token&&["b","s"].includes(type)&&action?{token,type,action,extra}:null;
};
const short=(value,max)=>String(value||"").slice(0,max);
const costText=cost=>cost?`${cost.amount} ${cost.resource==='hope'?'Hope':cost.resource.replace("_"," ")}`:"no resource cost";
const registryHash=data=>createHash('sha256').update(JSON.stringify(data)).digest('hex');
function completedPayload(db,guild,row,user,prefix='Saved native operation once.'){
  const text=`${prefix}\n\n${formatRollRequest(row,{user,db,guild})}`;
  return {content:text.length<=1900?text:`${prefix}\nRequest: ${row.record_key}; status: ${row.status}. Complete private receipt attached; /vc-roll result remains available.`,
    components:[],allowedMentions:{parse:[]},...(text.length>1900?{files:[new AttachmentBuilder(Buffer.from(text),{name:'private-native-roll.txt'})]}:{})};
}

function render(db,guild,tokenRow){
  const data=tokenRow.data,row=ownedRollRequest(db,guild,data.owner_user_id,data.request);
  const registry=db.getCityRecord(guild,"roll_option_registry",data.request),options=registry?.data.options||[];
  const choices=options.filter(item=>item.state==="requires_owner_choice"),selected=new Set(data.selected_keys||[]);
  const page=Math.max(0,Math.min(data.page||0,Math.max(0,Math.ceil(choices.length/20)-1))),shown=choices.slice(page*20,page*20+20);
  const experience=options.filter(item=>item.type==="experience"&&item.state==="applied").reduce((sum,item)=>sum+(item.effect?.amount||0),0);
  const base=row.data.breakdown.subtotal;
  const lines=[`**Private Daggerheart roll menu — ${row.data.character_name}**`,`Request: \`${row.record_key}\``,
    `Attempt: ${row.data.attempt}`,`Base subtotal: ${base===null?"review required":base>=0?`+${base}`:base}`,
    `Applied Experience: ${experience>=0?`+${experience}`:experience}`,
    ...(row.data.input?.gm_ruling?[`Difficulty: ${row.data.breakdown.difficulty===null?'not disclosed / awaiting adjudication':row.data.breakdown.difficulty}`,
      ...gmRulingDetails(db,guild,row,data.owner_user_id)]:[]),
    ...options.map(item=>`${selected.has(item.key)?"☑":"☐"} **${item.label}** ${item.type==="alternate_trait"?`trait (subtotal ${item.effect.amount>=0?"+":""}${item.effect.amount})`:item.effect?.amount>=0?`+${item.effect.amount}`:item.effect?.amount||""} — ${costText(item.cost)}${item.exclusive_group?` — choose one: ${item.exclusive_group}`:""} — ${item.state.replaceAll('_',' ')} — ${item.reason}${item.frequency?` — ${item.frequency}`:''}`),
    `Status: **${row.status}** • request revision \`${rollRevision(row).slice(0,12)}\``,'Nothing is spent until you press **Confirm**. `/vc-roll contribute` remains the accessible fallback.'];
  const components=[];
  if(shown.length)components.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
    .setCustomId(custom(tokenRow.record_key,"s","options")).setPlaceholder("Select optional roll choices")
    .setMinValues(0).setMaxValues(shown.length).addOptions(shown.map((item,index)=>({label:short(item.label,100),
      description:short(`${item.type==="alternate_trait"?"alternate trait; ":`${item.effect?.amount>=0?"+":""}${item.effect?.amount||0}; `}${costText(item.cost)}`,100),
      value:`o${page*20+index}`,default:selected.has(item.key)})))));
  components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(custom(tokenRow.record_key,"b","confirm")).setLabel("Confirm").setStyle(ButtonStyle.Success).setDisabled(!selected.size),
    new ButtonBuilder().setCustomId(custom(tokenRow.record_key,"b","roll")).setLabel("Roll now").setStyle(ButtonStyle.Primary).setDisabled(row.status!=="pending"),
    new ButtonBuilder().setCustomId(custom(tokenRow.record_key,"b","refresh")).setLabel("Refresh").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(custom(tokenRow.record_key,"b","cancel")).setLabel("Close menu").setStyle(ButtonStyle.Secondary)));
  if(choices.length>20)components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(custom(tokenRow.record_key,"b","prev")).setLabel("Previous").setStyle(ButtonStyle.Secondary).setDisabled(page===0),
    new ButtonBuilder().setCustomId(custom(tokenRow.record_key,"b","next")).setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled((page+1)*20>=choices.length)));
  const pages=splitDiscordText(lines.join('\n'),1400),detailPage=Math.max(0,Math.min(data.details_page||0,pages.length-1));
  if(pages.length>1)components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(custom(tokenRow.record_key,'b','details-prev')).setLabel('Earlier details').setStyle(ButtonStyle.Secondary).setDisabled(detailPage===0),
    new ButtonBuilder().setCustomId(custom(tokenRow.record_key,'b','details-next')).setLabel('More details').setStyle(ButtonStyle.Secondary).setDisabled(detailPage+1>=pages.length)));
  return {content:`**Private roll details ${detailPage+1}/${pages.length}; choices ${page+1}/${Math.max(1,Math.ceil(choices.length/20))}**\n${pages[detailPage]}\n\nSelection is a preview. Confirm authorizes the listed costs; Roll now is separate. Complete text is attached.`,
    components,ephemeral:true,allowedMentions:{parse:[]},files:[new AttachmentBuilder(Buffer.from(lines.join('\n')),{name:'private-roll-options.txt'})]};
}

export function openRollMenu(db,guild,user,request){
  const row=ownedRollRequest(db,guild,user,request);
  if(row.data.owner_user_id!==user)throw new PermissionError('Only the acting owner may open full private roll choices; helpers and partners use their scoped native contribution commands.');
  if(!["pending","needs_review","awaiting_selection"].includes(row.status))throw new StateConflictError("A current unsettled owned request is required.");
  gmRulingDetails(db,guild,row,user); // Validate before creating registry/UI records; presentation grants no execution permission.
  const registry=arbitrateRollOptions(db,guild,user,{request:row.record_key,proposed_keys:[]});
  const token=randomUUID().replaceAll("-","").slice(0,24);
  const saved=db.saveCityRecord(guild,{kind:"roll_menu_token",key:token,status:"active",source_event:row.source_event,
    visibility:"character",subject_key:row.subject_key,data:{version:1,guild,session_id:row.data.session_id,user,owner_user_id:user,
      character_id:row.subject_key,request:row.record_key,expected_revision:rollRevision(row),registry:registry.record_key,
      registry_hash:registryHash(db.getCityRecord(guild,'roll_option_registry',row.record_key).data),
      selected_keys:[],page:0,authority:"Private UI authorization only; native operation receipts own costs and outcomes."}});
  return render(db,guild,saved);
}

function currentToken(db,guild,interaction){
  const id=parse(interaction.customId);if(!id)return null;
  const token=db.getCityRecord(guild,"roll_menu_token",id.token);
  if(!token||token.data.guild!==guild||token.data.user!==interaction.user.id||token.subject_key!==token.data.character_id)
    throw new PermissionError("This private roll menu does not belong to the current owner.");
  if(token.status!=="active")throw new StateConflictError("This roll menu is closed or already used; open a fresh current menu.");
  const row=ownedRollRequest(db,guild,interaction.user.id,token.data.request);
  if(row.data.owner_user_id!==interaction.user.id)throw new PermissionError('Only the acting owner may use this private roll menu.');
  if(rollRevision(row)!==token.data.expected_revision)throw new StateConflictError("The request changed; this menu is stale. Open a fresh menu.");
  const registry=db.getCityRecord(guild,'roll_option_registry',row.record_key);
  if(!registry||token.data.registry_hash!==registryHash(registry.data))throw new StateConflictError('The private option registry changed or this is an older menu; open a fresh menu.');
  if(registry?.data.sheet_fingerprint!==createHash('sha256').update(JSON.stringify(db.getCharacter(row.subject_key).data)).digest('hex'))
    throw new StateConflictError('The character sheet changed; this menu is stale. Open a fresh menu before choosing costs.');
  return {id,token,row};
}
function saveToken(db,guild,token,data,status=token.status){
  return db.saveCityRecord(guild,{...token,key:token.record_key,status,data:{...token.data,...data}});
}

export async function handleRollMenuInteraction(db,interaction,{rng}={}){
  const current=currentToken(db,interaction.guildId,interaction);if(!current)return false;
  let {id,token,row}=current;
  if(id.type==="s"&&id.action==="options"){
    const registry=db.getCityRecord(interaction.guildId,"roll_option_registry",row.record_key),choices=(registry?.data.options||[])
      .filter(item=>item.state==="requires_owner_choice");
    const indices=(interaction.values||[]).map(value=>/^o\d+$/.test(value)?Number(value.slice(1)):-1);
    const page=token.data.page||0;
    if(new Set(indices).size!==indices.length||indices.some(index=>index<page*20||index>=(page+1)*20||!choices[index]))throw new UserInputError("Selected roll option is not on this private menu page.");
    const pageKeys=new Set(choices.slice(page*20,page*20+20).map(x=>x.key));
    const selectedKeys=[...(token.data.selected_keys||[]).filter(key=>!pageKeys.has(key)),...indices.map(index=>choices[index].key)];
    const selected=choices.filter(item=>selectedKeys.includes(item.key)),groups=selected.map(item=>item.exclusive_group).filter(Boolean);
    if(new Set(groups).size!==groups.length)throw new StateConflictError("Mutually exclusive roll options cannot be selected together.");
    token=saveToken(db,interaction.guildId,token,{selected_keys:selected.map(item=>item.key)});
    await interaction.update(render(db,interaction.guildId,token));return true;
  }
  if(id.type!=="b")return false;
  if(['details-prev','details-next'].includes(id.action)){
    token=saveToken(db,interaction.guildId,token,{details_page:Math.max(0,(token.data.details_page||0)+(id.action==='details-next'?1:-1))});
    await interaction.update(render(db,interaction.guildId,token));return true;
  }
  if(id.action==="cancel"){
    saveToken(db,interaction.guildId,token,{},"cancelled");
    await interaction.update({content:"Private roll menu closed. The native request remains available and nothing was spent.",components:[]});return true;
  }
  if(["refresh","prev","next"].includes(id.action)){
    const page=id.action==="prev"?Math.max(0,(token.data.page||0)-1):id.action==="next"?(token.data.page||0)+1:0;
    token=saveToken(db,interaction.guildId,token,{page,details_page:0});await interaction.update(render(db,interaction.guildId,token));return true;
  }
  if(id.action==="confirm"){
    const fresh=discoverRollOptions(db,interaction.guildId,interaction.user.id,row.record_key),byKey=new Map(fresh.options.map(item=>[item.key,item]));
    const selected=(token.data.selected_keys||[]).map(key=>byKey.get(key));
    if(!selected.length||selected.some(item=>!item||item.state!=="requires_owner_choice"
      ||item.type==="experience"&&!item.source.proof||!["experience","alternate_trait"].includes(item.type)))
      throw new StateConflictError("Selected options are no longer current or need additional authorization.");
    if(selected.some(item=>item.type==="alternate_trait")&&selected.length>1)
      throw new StateConflictError("Choose an alternate trait first, then review recalculated Experience options on a fresh menu.");
    const groups=selected.map(item=>item.exclusive_group).filter(Boolean);
    if(new Set(groups).size!==groups.length)throw new StateConflictError("Mutually exclusive options cannot be confirmed together.");
    row=db.transaction(()=>{
      saveToken(db,interaction.guildId,token,{},"applying");let amended=row;
      for(const item of selected)amended=contributeRoll(db,interaction.guildId,interaction.user.id,item.type==="alternate_trait"?{
        op:"alternate-trait",request:row.record_key,expected_revision:rollRevision(amended),key:`menu-${token.record_key}-${createHash('sha256').update(item.key).digest('hex').slice(0,24)}`,
        trait:item.effect.trait,proof:item.source.event}:{op:"experience",request:row.record_key,expected_revision:rollRevision(amended),
        key:`menu-${token.record_key}-${createHash('sha256').update(item.key).digest('hex').slice(0,24)}`,experience:item.label,pay_hope:true,proof:item.source.proof,
        description:item.source.proof_description},{rng});
      saveToken(db,interaction.guildId,token,{applied_keys:selected.map(item=>item.key)},"used");return amended;
    });
    await finishRollOperation(db,interaction,row,()=>interaction.update(completedPayload(db,interaction.guildId,row,interaction.user.id,'Selections applied once.')));return true;
  }
  if(id.action==="roll"){
    row=db.transaction(()=>{
      saveToken(db,interaction.guildId,token,{},"applying");
      const result=contributeRoll(db,interaction.guildId,interaction.user.id,{op:"roll",request:row.record_key,
        expected_revision:rollRevision(row),key:`menu-${token.record_key}-roll`},{rng});
      saveToken(db,interaction.guildId,token,{},"used");return result;
    });
    await finishRollOperation(db,interaction,row,()=>interaction.update(completedPayload(db,interaction.guildId,row,interaction.user.id)));return true;
  }
  return false;
}

export function isRollMenuInteraction(interaction){return !!parse(interaction?.customId);}
