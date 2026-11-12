#!/usr/bin/env node
'use strict'
/**
 * Rebuilds documentation/assets/protocol-data.js from the schema this bot
 * actually encodes with:
 *   src/engine/bedrockx-lib/protocol/protocol.json
 *
 * Run from anywhere:  node documentation/tools/build-data.js
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
const SRC = path.join(ROOT, 'src', 'engine', 'bedrockx-lib', 'protocol', 'protocol.json')
const OUT = path.join(__dirname, '..', 'assets', 'protocol-data.js')

const GAME_VERSION = '1.26.60'
const PROTOCOL_VERSION = 2225

const protocol = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const types = protocol.types

// mcpe_packet carries the id -> name mapper; that is the packet index.
const packetMapper = types.mcpe_packet[1][0].type[1].mappings

/** Direction is NOT in this schema. Hand-curated for the well-known packets. */
const DIRECTIONS = {
  login: 'server', request_network_settings: 'server', network_settings: 'client',
  server_to_client_handshake: 'client', client_to_server_handshake: 'server',
  disconnect: 'both', play_status: 'client', resource_packs_info: 'client',
  resource_pack_stack: 'client', resource_pack_client_response: 'server',
  text: 'both', set_time: 'client', start_game: 'client', add_player: 'client',
  add_entity: 'client', remove_entity: 'client', add_item_entity: 'client',
  take_item_entity: 'client', move_entity: 'both', move_player: 'both',
  rider_jump: 'both', update_block: 'client', add_painting: 'client',
  tick_sync: 'client', level_sound_event: 'both', level_event: 'both',
  block_event: 'client', entity_event: 'both', mob_effect: 'client',
  update_attributes: 'client', inventory_transaction: 'both', mob_equipment: 'both',
  mob_armor_equipment: 'both', interact: 'server', block_pick_request: 'server',
  entity_pick_request: 'server', player_action: 'server', hurt_armor: 'server',
  set_entity_data: 'client', set_entity_motion: 'client', set_entity_link: 'client',
  set_health: 'client', set_spawn_position: 'client', animate: 'both',
  respawn: 'both', container_open: 'client', container_close: 'both',
  player_hotbar: 'client', inventory_content: 'client', inventory_slot: 'client',
  container_set_data: 'client', crafting_data: 'client', crafting_event: 'server',
  level_chunk: 'client', set_commands_enabled: 'client', set_difficulty: 'client',
  change_dimension: 'client', set_player_game_type: 'client', player_list: 'client',
  simple_event: 'client', event: 'client', spawn_experience_orb: 'client',
  clientbound_map_item_data: 'client', request_chunk_radius: 'server',
  chunk_radius_updated: 'client', item_component: 'client', item_registry: 'client',
  player_skin: 'client', set_player_game_type_2: 'client', subchunk_request: 'server',
  client_cache_status: 'server', client_cache_blob_status: 'server',
  client_cache_miss_response: 'client', command_request: 'server',
  command_output: 'client', available_commands: 'client',
  serverbound_loading_screen: 'server', command_block_update: 'client',
  set_local_player_as_initialized: 'server', player_auth_input: 'server',
  emote: 'server', emote_list: 'client', animation: 'both', transfer: 'client',
  set_score: 'client', set_display_objective: 'client', remove_objective: 'client',
  set_display_objective_2: 'client', update_equipment: 'client',
  level_settings: 'client', update_player_game_type: 'client',
  update_client_input_locks: 'client', player_enchant_options: 'client',
  update_abilities: 'client', player_armor_damage: 'server', toast_request: 'client',
  update_block_properties: 'client', update_soft_enum: 'client',
  network_chunk_publisher_update: 'client', camera: 'client',
  camera_presets: 'client', boss_event: 'client', tick_sync_state: 'client',
  client_start_item_cooldown: 'client', set_title: 'client', scoreboard_identity: 'client',
  set_player_movement_settings: 'client', education_settings: 'client',
  request_permissions: 'server', request_ability: 'both', death_info: 'client',
  creative_content: 'client', player_skin_2: 'client', structure_template_data_export_request: 'client',
  update_trade: 'client', update_soft_enum_2: 'client', packet_violation_warning: 'both',
  motion_prediction_hints: 'client', annotate: 'client', map_create_locked_copy: 'client',
  network_stack_latency: 'both', script_message: 'both', debug_info: 'client',
  set_default_game_type: 'client', sync_player_list: 'client', add_behavior_tree: 'client',
  position_tracking_db_request: 'server', position_tracking_db_broadcast: 'client',
  subchunk: 'client', submit_simulated_player_info: 'server', client_cache_blob_status_2: 'server',
}

function collectArrays (fields, prefix, out) {
  if (!Array.isArray(fields)) return
  for (const f of fields) {
    const name = f.name || '(anon)'
    const at = prefix ? `${prefix}.${name}` : name
    const t = f.type

    if (Array.isArray(t) && typeof t[0] === 'string') {
      const kind = t[0]
      const opts = t[1] || {}
      if (kind === 'array') {
        out.push({
          path: at,
          count: opts.countType || (opts.count != null ? JSON.stringify(opts.count) : 'inline'),
          element: typeShort(opts.type),
          elementType: opts.type
        })
        if (Array.isArray(opts.type) && opts.type[0] === 'container') {
          collectArrays(opts.type[1], at + '[]', out)
        }
      } else if (kind === 'container') {
        collectArrays(opts, at, out)
      } else if (kind === 'switch') {
        for (const [k, v] of Object.entries(opts.fields || {})) {
          const before = out.length
          if (Array.isArray(v) && v[0] === 'container') collectArrays(v[1], prefix, out)
          else collectArrays([{ name, type: v }], prefix, out)
          for (let i = before; i < out.length; i++) {
            out[i].caseOf = { compareTo: opts.compareTo, value: k }
          }
        }
      }
    } else if (Array.isArray(t) && typeof t[0] === 'object') {
      collectArrays(t[0], at, out)
    }
  }
}

function typeShort (t) {
  if (t === undefined) return '?'
  if (typeof t === 'string') return t
  if (Array.isArray(t)) {
    if (typeof t[0] === 'string') {
      if (t[0] === 'container') return 'container'
      if (t[0] === 'switch') return 'switch'
      if (t[0] === 'mapper') return `mapper<${typeShort((t[1] || {}).type)}>`
      if (t[0] === 'array') return `array<${typeShort((t[1] || {}).type)}>`
      if (t[0] === 'buffer') return 'bytes'
      if (t[0] === 'encapsulated') return `len-prefixed<${typeShort((t[1] || {}).type)}>`
      return t[0]
    }
    return typeShort(t[0])
  }
  return 'inline'
}

function countFields (fields) {
  if (!Array.isArray(fields)) return 0
  let n = 0
  for (const f of fields) {
    n++
    const t = f.type
    if (Array.isArray(t) && typeof t[0] === 'string') {
      const opt = t[1] || {}
      if (t[0] === 'container') n += countFields(opt)
      else if (t[0] === 'switch') for (const v of Object.values(opt.fields || {})) n += countFields(v && v[1])
    } else if (Array.isArray(t) && typeof t[0] === 'object') {
      n += countFields(t[0])
    }
  }
  return n
}

const packets = Object.keys(packetMapper).map((id) => {
  const name = packetMapper[id]
  const def = types['packet_' + name]
  const fields = def && Array.isArray(def[1]) ? def[1] : []
  const arrays = []
  collectArrays(fields, '', arrays)
  return {
    id: Number(id),
    name,
    direction: DIRECTIONS[name] || null,
    fieldCount: countFields(fields),
    arrays,
    fields
  }
}).sort((a, b) => a.id - b.id)

// Type explorer: everything that is not a packet body.
const typeIndex = Object.keys(types)
  .filter((n) => !n.startsWith('packet_') && n !== 'mcpe_packet')
  .map((n) => ({ name: n, kind: typeShort(types[n]) }))
  .sort((a, b) => a.name.localeCompare(b.name))

const out = {
  meta: {
    gameVersion: GAME_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    source: 'src/engine/bedrockx-lib/protocol/protocol.json',
    generated: new Date().toISOString().slice(0, 10),
    packetCount: packets.length,
    typeCount: typeIndex.length,
    arrayPacketCount: packets.filter((p) => p.arrays.length > 0).length,
    arrayFieldCount: packets.reduce((a, p) => a + p.arrays.length, 0)
  },
  packets,
  typeIndex,
  types
}

const banner = '/* Generated by documentation/tools/build-data.js — do not edit by hand. */\n'
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, banner + 'window.MCPE_DOCS = ' + JSON.stringify(out) + ';\n')

console.log(`wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`)
console.log(`  packets: ${out.meta.packetCount}`)
console.log(`  types:   ${out.meta.typeCount}`)
console.log(`  packets with arrays: ${out.meta.arrayPacketCount} (${out.meta.arrayFieldCount} array fields)`)
