import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PACK_IDS, entitlementId, productId, parsePackProofs, packWebhookUsers } from '../supabase/functions/_shared/cosmetic-packs.ts';
const pack = PACK_IDS[0];
const snapshot = () => ({subscriber:{entitlements:{[entitlementId(pack)]:{product_identifier:productId(pack),expires_date:null}},
  non_subscriptions:{[productId(pack)]:[{id:'receipt-1',store:'app_store',is_sandbox:true,purchase_date:'2026-09-09T12:00:00Z'}]}}});
test('one verified non-consumable grants exactly the matching pack',()=>{
  const proofs=parsePackProofs(snapshot());
  assert.equal(proofs.length,6); assert.equal(proofs.filter(x=>x.active).length,1);
  assert.equal(proofs[0].transaction_id,'receipt-1');
});
test('refund removes the entitlement even when transaction history remains',()=>{
  const value=snapshot(); value.subscriber.entitlements={};
  assert.ok(parsePackProofs(value).every(x=>!x.active));
});
test('malformed or incomplete receipts never grant or revoke',()=>{
  assert.throws(()=>parsePackProofs({}));
  const value=snapshot(); value.subscriber.non_subscriptions={};
  assert.throws(()=>parsePackProofs(value));
});
test('aliases do not duplicate purchases; transfers reconcile source first',()=>{
  const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
  assert.deepEqual(packWebhookUsers({app_user_id:a,aliases:[a,b]}),[a]);
  assert.deepEqual(packWebhookUsers({type:'TRANSFER',transferred_from:[a],transferred_to:[b]}),[a,b]);
});
