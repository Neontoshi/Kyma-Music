use crate::audio::EngineHandle;
use crate::commands::player::FrontendSong;
use crate::models::song::Song;
use crate::user_action;
use crate::user_error;
use parking_lot::Mutex;
use sqlx::SqlitePool;
use std::sync::Arc;
use tauri::AppHandle;

pub struct AppState {
    pub audio_engine: EngineHandle,
    pub current_track: Arc<Mutex<Option<FrontendSong>>>,
    pub volume: Arc<Mutex<f32>>,
    pub is_playing: Arc<Mutex<bool>>,
    pub queue: Arc<Mutex<Vec<FrontendSong>>>,
    pub queue_index: parking_lot::Mutex<usize>,
    pub library: Arc<Mutex<Vec<Song>>>,
    pub db: SqlitePool,
}

impl AppState {
    pub async fn new(app_handle: AppHandle) -> Self {
        user_action!("APP", "Initializing AppState");

        let db = match Self::init_db().await {
            Ok(pool) => {
                user_action!("APP", "Database initialized successfully");
                pool
            }
            Err(e) => {
                user_error!("APP", "Failed to initialize database: {}", e);
                panic!("Database initialization failed: {}", e);
            }
        };

        let engine = EngineHandle::new(app_handle);
        let state = engine.get_state();
        user_action!(
            "APP",
            "Audio engine ready: playing={}, volume={}",
            state.is_playing,
            state.volume
        );
        tracing::info!("[AppState] engine ready: {:?}", state);

        Self {
            audio_engine: engine,
            current_track: Arc::new(Mutex::new(None)),
            volume: Arc::new(Mutex::new(0.7)),
            is_playing: Arc::new(Mutex::new(false)),
            queue: Arc::new(Mutex::new(Vec::new())),
            queue_index: parking_lot::Mutex::new(0),
            library: Arc::new(Mutex::new(Vec::new())),
            db,
        }
    }

    async fn init_db() -> Result<SqlitePool, sqlx::Error> {
        let db_path = dirs::data_local_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("Kyma")
            .join("Kyma.db");

        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let db_url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy());
        user_action!("APP", "Connecting to database at: {}", db_path.display());

        let pool = SqlitePool::connect(&db_url).await?;

        sqlx::query("PRAGMA busy_timeout = 5000")
            .execute(&pool)
            .await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at INTEGER DEFAULT (unixepoch())
            )",
        )
        .execute(&pool)
        .await?;

        let current_version: Option<i64> =
            sqlx::query_scalar("SELECT MAX(version) FROM schema_version")
                .fetch_optional(&pool)
                .await?
                .flatten();

        let target_version = 1i64;

        let current = current_version.unwrap_or(0);
        if current < target_version {
            user_action!(
                "APP",
                "Migrating database from version {} to {}",
                current,
                target_version
            );

            let mut tx = pool.begin().await?;

            sqlx::query(include_str!("../../migration/001_init.sql"))
                .execute(&mut *tx)
                .await?;

            sqlx::query("INSERT INTO schema_version (version) VALUES (?)")
                .bind(target_version)
                .execute(&mut *tx)
                .await?;

            tx.commit().await?;

            user_action!("APP", "Database migration completed");
        } else {
            user_action!("APP", "Database schema is up to date (version {})", current);
        }

        Ok(pool)
    }
}
