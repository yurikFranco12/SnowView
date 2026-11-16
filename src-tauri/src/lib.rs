//! SnowView: arranque de la app.
//!
//! El mismo código sirve para Windows y para Android. Lo que solo existe en el escritorio (bandeja
//! del sistema, arranque con Windows, ocultar la ventana al cerrar) vive en el módulo `desktop` y
//! no se compila en el móvil.

#[cfg(desktop)]
mod desktop {
  use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Manager, Window, WindowEvent,
  };

  /// Argumento con el que arranca la app cuando la inicia Windows: empieza oculta en la bandeja.
  pub const MINIMIZED_ARG: &str = "--minimized";

  /// Muestra la ventana principal, la restaura si estaba minimizada y le da el foco.
  fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
      let _ = window.show();
      let _ = window.unminimize();
      let _ = window.set_focus();
    }
  }

  /// Bandeja del sistema: clic izquierdo abre la ventana; el menú tiene Abrir y Salir.
  pub fn setup(app: &mut App) -> tauri::Result<()> {
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
  }

  /// Cerrar la ventana la oculta en la bandeja: así las reglas siguen evaluándose. Para salir de
  /// verdad, "Salir" en el menú de la bandeja.
  pub fn on_window_event(window: &Window, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
      api.prevent_close();
      let _ = window.hide();
    }
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    // Almacenamiento clave-valor en un JSON de la carpeta de datos de la app (favoritas, ajustes).
    .plugin(tauri_plugin_store::Builder::default().build())
    // Notificaciones nativas al cumplirse una regla (Windows y Android).
    .plugin(tauri_plugin_notification::init());

  // Solo escritorio: arranque con Windows (interruptor en Ajustes), oculta en la bandeja.
  #[cfg(desktop)]
  let builder = builder
    .plugin(tauri_plugin_autostart::init(
      tauri_plugin_autostart::MacosLauncher::LaunchAgent,
      Some(vec![desktop::MINIMIZED_ARG]),
    ))
    .on_window_event(desktop::on_window_event);

  builder
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      #[cfg(desktop)]
      desktop::setup(app)?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
