-- Threshold Tactics: Refresh all score-tracker Browser Sources in OBS.
-- Install from OBS: Tools > Scripts > +, then select this file.

obs = obslua

local tracker_host = "aos-score-kay-sept17.kaypeters.chatgpt.site"
local hotkey_id = obs.OBS_INVALID_HOTKEY_ID

local function refreshed_url(url)
  local stamp = tostring(os.time())
  local updated, replacements = string.gsub(url, "([?&])obsRefresh=[^&]*", "%1obsRefresh=" .. stamp)
  if replacements == 0 then
    updated = url .. (string.find(url, "?", 1, true) and "&" or "?") .. "obsRefresh=" .. stamp
  end
  return updated
end

function refresh_threshold_tactics_sources()
  local sources = obs.obs_enum_sources()
  local refreshed = 0

  if sources ~= nil then
    for _, source in ipairs(sources) do
      if obs.obs_source_get_unversioned_id(source) == "browser_source" then
        local settings = obs.obs_source_get_settings(source)
        local url = obs.obs_data_get_string(settings, "url")

        if url ~= nil and string.find(url, tracker_host, 1, true) then
          obs.obs_data_set_string(settings, "url", refreshed_url(url))
          obs.obs_source_update(source, settings)
          refreshed = refreshed + 1
        end

        obs.obs_data_release(settings)
      end
    end
    obs.source_list_release(sources)
  end

  obs.script_log(obs.LOG_INFO, "Threshold Tactics: refreshed " .. tostring(refreshed) .. " Browser Sources.")
end

function refresh_button_clicked(props, property)
  refresh_threshold_tactics_sources()
  return true
end

function refresh_hotkey_pressed(pressed)
  if pressed then
    refresh_threshold_tactics_sources()
  end
end

function script_description()
  return "Adds one button and an optional hotkey to refresh every Threshold Tactics score-tracker Browser Source."
end

function script_properties()
  local properties = obs.obs_properties_create()
  obs.obs_properties_add_button(properties, "refresh_all", "Refresh all Threshold Tactics Browser Sources", refresh_button_clicked)
  return properties
end

function script_load(settings)
  hotkey_id = obs.obs_hotkey_register_frontend("threshold_tactics.refresh_sources", "Refresh all Threshold Tactics Browser Sources", refresh_hotkey_pressed)
  local hotkey_array = obs.obs_data_get_array(settings, "refresh_hotkey")
  obs.obs_hotkey_load(hotkey_id, hotkey_array)
  obs.obs_data_array_release(hotkey_array)
end

function script_save(settings)
  local hotkey_array = obs.obs_hotkey_save(hotkey_id)
  obs.obs_data_set_array(settings, "refresh_hotkey", hotkey_array)
  obs.obs_data_array_release(hotkey_array)
end
