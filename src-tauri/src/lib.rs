use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  AppHandle, Manager, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

/// Argumento con el que arranca la app cuando la inicia Windows: empieza oculta en la bandeja.
const MINIMIZED_ARG: &str = "--minimized";

/// Muestra la ventana principal, la restaura si estaba minimizada y le da el foco.
fn show_main_window(app: &AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Almacenamiento clave-valor en un JSON de la carpeta de datos de la app (favoritas, ajustes).
    .plugin(tauri_plugin_store::Builder::default().build())
    // Notificaciones nativas de Windows al cumplirse una regla.
    .plugin(tauri_plugin_notification::init())
    // Arranque con Windows (opcional, con interruptor en Ajustes). Arranca oculta en la bandeja.
    .plugin(tauri_plugin_autostart::init(
      MacosLauncher::LaunchAgent,
      Some(vec![MINIMIZED_ARG]),
    ))
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Bandeja del sistema: clic izquierdo abre la ventana; el menú tiene Abrir y Salir.
      let open = MenuItem::with_id(app, "open", "Abrir SnowView", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "Salir", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&open, &quit])?;
      let mut tray = TrayIconBuilder::new()
        .tooltip("SnowView")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "open" => show_main_window(app),
          "quit" => app.exit(0),
          _ => {}
        })
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            show_main_window(tray.app_handle());
          }
        });
      if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
      }
      tray.build(app)?;

      // Si lo ha iniciado Windows, la ventana se queda oculta en la bandeja.
      if std::env::args().any(|a| a == MINIMIZED_ARG) {
        if let Some(window) = app.get_webview_window("main") {
          let _ = window.hide();
        }
      }
      Ok(())
    })
    // Cerrar la ventana la oculta en la bandeja: así las reglas siguen evaluándose. Para salir de
    // verdad, "Salir" en el menú de la bandeja.
    .on_window_event(|window, event| {
      if let WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
      }
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
