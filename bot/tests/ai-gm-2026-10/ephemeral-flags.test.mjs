import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageFlags} from 'discord.js';
import {translateEphemeralReplies} from '../../src/commands.js';

test('ephemeral reply options become MessageFlags.Ephemeral on every reply path', async () => {
  const sent = [];
  const interaction = {reply: async p => sent.push(['reply', p]), deferReply: async p => sent.push(['deferReply', p]), followUp: async p => sent.push(['followUp', p])};
  translateEphemeralReplies(translateEphemeralReplies(interaction));
  await interaction.reply({content: 'a', ephemeral: true});
  await interaction.deferReply({ephemeral: true});
  await interaction.followUp({content: 'b', ephemeral: false});
  await interaction.reply('plain');
  assert.deepEqual(sent, [
    ['reply', {content: 'a', flags: MessageFlags.Ephemeral}],
    ['deferReply', {flags: MessageFlags.Ephemeral}],
    ['followUp', {content: 'b'}],
    ['reply', 'plain']]);
});
