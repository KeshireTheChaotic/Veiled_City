/** Closed non-effect native clauses; no generated prose or authority fields. */
const obj=properties=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const choice=values=>({type:'string',enum:values});
export const nativeClauseSchema={anyOf:[
  obj({kind:choice(['weather']),phenomenon:choice(['rain','mist','snow']),motion:choice(['bead','settle']),surface:choice(['window','glass','awning','pavement'])}),
  obj({kind:choice(['physical_sense']),sense:choice(['touch','hearing','smell']),stimulus:choice(['warm_air','low_hum','detergent']),origin:choice(['dryers','room','laundry'])}),
  obj({kind:choice(['known_pc_query']),character_ref:{type:'string',maxLength:160},name:{type:'string',maxLength:160},question:choice(['seen','looking_for'])})
]};
