/** Opaque in-process application principals. Serialized model output can never mint one of these capabilities. */
const principals=new WeakSet();
export function applicationPrincipal(guild,operation,id){
  const principal=Object.freeze({guild,operation,id});principals.add(principal);return principal;
}
export const principalAllows=(principal,guild,operation)=>!!principal&&principals.has(principal)&&principal.guild===guild&&principal.operation===operation;
