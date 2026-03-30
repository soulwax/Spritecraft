// File: lib/src/server/studio_server.dart

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:path/path.dart' as path;
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_router/shelf_router.dart';

import '../ai/sprite_brief_composer.dart';
import '../ai/gemini_sprite_planner.dart';
import '../ai/sprite_naming_suggester.dart';
import '../ai/sprite_style_helper.dart';
import '../config/runtime_config.dart';
import '../lpc/lpc_catalog.dart';
import '../lpc/lpc_consistency_checker.dart';
import '../lpc/lpc_renderer.dart';
import '../logging/structured_logger.dart';
import '../models/lpc_models.dart';
import '../models/sprite_name_suggestions.dart';
import '../models/sprite_plan.dart';
import '../models/sprite_style_helper.dart';
import '../persistence/history_repository.dart';
import 'export_support.dart';
import 'recovery_support.dart';

class StudioServer {
  static const Duration _historyConnectTimeout = Duration(seconds: 10);

  StudioServer._({
    required this.config,
    required this.catalog,
    required this.renderer,
    required this.historyRepository,
    required this.logger,
  });

  final RuntimeConfig config;
  final LpcCatalog catalog;
  final LpcRenderer renderer;
  final HistoryRepository? historyRepository;
  final StructuredLogger logger;
  final Map<String, LpcRenderResult> _renderCache = <String, LpcRenderResult>{};
  final Map<String, _ExportJob> _exportJobs = <String, _ExportJob>{};
  int _exportJobCounter = 0;

  static Future<StudioServer> create(RuntimeConfig config) async {
    final StructuredLogger logger = StructuredLogger();
    for (final String warning in config.configurationWarnings) {
      logger.warning(
        subsystem: 'startup',
        event: 'configuration_warning',
        message: warning,
      );
    }
    for (final RuntimeStartupCheck check in config.startupChecks) {
      if (check.status == 'ok') {
        continue;
      }
      final Map<String, Object?> context = <String, Object?>{
        'check': check.code,
        if (check.location != null) 'location': check.location,
      };
      if (check.status == 'warning') {
        logger.warning(
          subsystem: 'startup',
          event: 'startup_check_warning',
          message: check.detail,
          context: context,
        );
      } else {
        logger.error(
          subsystem: 'startup',
          event: 'startup_check_failed',
          message: check.detail,
          context: context,
        );
      }
    }
    if (config.hasStartupErrors) {
      throw StateError(config.startupFailureMessage);
    }
    final LpcCatalog catalog;
    try {
      catalog = await const LpcCatalogLoader().load(
        config.lpcDefinitionsDirectory,
      );
    } on Exception catch (error, stackTrace) {
      logger.error(
        subsystem: 'startup',
        event: 'catalog_load_failed',
        message: 'Could not load the LPC catalog during backend startup.',
        context: <String, Object?>{
          'definitionsDirectory': config.lpcDefinitionsDirectory.path,
        },
        error: error,
        stackTrace: stackTrace,
      );
      rethrow;
    }
    for (final String warning in catalog.loadWarnings) {
      logger.warning(
        subsystem: 'startup',
        event: 'catalog_definition_warning',
        message: warning,
      );
    }
    HistoryRepository? historyRepository;
    try {
      historyRepository = await HistoryRepository.connect(
        config.databaseUrl,
      ).timeout(_historyConnectTimeout);
    } on Exception catch (error, stackTrace) {
      if (config.hasDatabase) {
        logger.warning(
          subsystem: 'database',
          event: 'history_connect_failed',
          message:
              'DATABASE_URL is configured, but history persistence could not be initialized.',
          error: error,
          stackTrace: stackTrace,
        );
      }
      historyRepository = null;
    }

    return StudioServer._(
      config: config,
      catalog: catalog,
      renderer: LpcRenderer(
        catalog: catalog,
        spritesheetsDirectory: config.lpcSpritesheetsDirectory,
        decodedAssetCacheDirectory: config.renderCacheDirectory,
      ),
      historyRepository: historyRepository,
      logger: logger,
    );
  }

  Future<HttpServer> serve({String host = '127.0.0.1', int port = 8080}) async {
    final Router router = Router()
      ..get('/health', _health)
      ..get('/api/health', _health)
      ..get('/bootstrap', _bootstrap)
      ..get('/api/bootstrap', _bootstrap)
      ..get('/api/studio/bootstrap', _bootstrap)
      ..get('/api/lpc/catalog', _catalog)
      ..post('/api/lpc/render', _render)
      ..post('/api/lpc/consistency', _consistency)
      ..post('/api/lpc/export', _export)
      ..get('/api/lpc/export/jobs/<id>', _exportJobStatus)
      ..post('/api/non-lpc/import', _importNonLpc)
      ..post('/api/ai/brief', _brief)
      ..post('/api/ai/naming', _naming)
      ..post('/api/ai/style-helper', _styleHelper)
      ..get('/api/history', _history)
      ..post('/api/history/import', _importHistoryPackage)
      ..post('/api/history/save', _saveHistory)
      ..post('/api/history/restore', _restoreHistory)
      ..post('/api/history/<id>/duplicate', _duplicateHistory)
      ..post('/api/history/<id>/export-package', _exportHistoryPackage)
      ..get('/api/history/<id>', _historyEntry)
      ..delete('/api/history/<id>', _deleteHistory);

    final Handler handler = Pipeline().addMiddleware(logRequests()).addHandler((
      Request request,
    ) async {
      try {
        if (request.url.path == 'health' ||
            request.url.path == 'bootstrap' ||
            request.url.path.startsWith('api/')) {
          final Response response = await router.call(request);
          if (response.statusCode == 404) {
            return _json(404, <String, Object>{'error': 'Not found'});
          }
          return response;
        }
        return _json(404, <String, Object>{
          'error':
              'SpriteCraft now serves the UI from studio. Start the web app separately and use this Dart server as the backend API.',
        });
      } on Exception catch (error, stackTrace) {
        logger.error(
          subsystem: 'server',
          event: 'request_failed',
          message:
              'An unhandled backend exception reached the request boundary.',
          context: _requestContext(request),
          error: error,
          stackTrace: stackTrace,
        );
        return _json(500, <String, Object>{
          'error': 'SpriteCraft hit an unexpected backend error.',
        });
      }
    });

    return shelf_io.serve(handler, host, port);
  }

  Future<Response> _bootstrap(Request request) async {
    final List<StudioHistoryEntry> recent =
        await historyRepository?.listRecent(limit: 8) ?? <StudioHistoryEntry>[];

    final Map<String, String> defaults = <String, String>{
      if (catalog.itemsById.containsKey('body')) 'body': 'light',
      if (catalog.itemsById.containsKey('heads_human_male'))
        'heads_human_male': 'light',
    };

    return _json(200, <String, Object?>{
      'config': <String, Object?>{
        'hasGemini': config.hasGemini,
        'hasDatabase': config.hasDatabase,
        'hasLpcProject': config.hasLpcProject,
        'hasStartupErrors': config.hasStartupErrors,
      },
      'startupChecks': config.startupChecks
          .map((RuntimeStartupCheck check) => check.toJson())
          .toList(),
      'catalog': catalog.toSummaryJson(),
      'exportPresets': ExportSupport.enginePresetOptions,
      'defaults': <String, Object?>{
        'bodyType': catalog.bodyTypes.contains('male')
            ? 'male'
            : (catalog.bodyTypes.isEmpty ? null : catalog.bodyTypes.first),
        'animation': catalog.animations.contains('idle')
            ? 'idle'
            : (catalog.animations.isEmpty ? null : catalog.animations.first),
        'selections': defaults,
      },
      'recent': recent
          .map((StudioHistoryEntry entry) => entry.toJson())
          .toList(),
    });
  }

  Future<Response> _health(Request request) async {
    final Map<String, Object> catalogSummary = catalog.toSummaryJson();
    final int categoryCount =
        (catalogSummary['categories'] as List<Object?>?)?.length ?? 0;
    final int tagCount =
        (catalogSummary['tags'] as List<Object?>?)?.length ?? 0;
    final List<Map<String, String>> checks = <Map<String, String>>[
      ...config.startupChecks.map(
        (RuntimeStartupCheck check) => check.toJson(),
      ),
      <String, String>{
        'label': 'Gemini',
        'status': config.hasGemini ? 'ok' : 'warning',
        'detail': config.hasGemini
            ? 'GEMINI_API_KEY is configured.'
            : 'GEMINI_API_KEY is not configured. AI suggestions will fall back to local recommendations.',
      },
      <String, String>{
        'label': '.env configuration',
        'status': config.configurationWarnings.isEmpty ? 'ok' : 'warning',
        'detail': config.configurationWarnings.isEmpty
            ? 'No .env parsing issues were detected.'
            : config.configurationWarnings.join(' '),
      },
      <String, String>{
        'label': 'Database',
        'status': historyRepository != null
            ? 'ok'
            : (config.hasDatabase ? 'warning' : 'warning'),
        'detail': historyRepository != null
            ? 'History persistence is available.'
            : (config.hasDatabase
                  ? 'DATABASE_URL is set, but history persistence is currently unavailable.'
                  : 'DATABASE_URL is not configured. History endpoints will be limited.'),
      },
      <String, String>{
        'label': 'Export directory',
        'status': 'ok',
        'detail': 'Exports will be written to ${config.exportDirectory.path}.',
      },
      <String, String>{
        'label': 'Catalog content',
        'status': catalog.itemsById.isEmpty
            ? 'error'
            : (catalog.loadWarnings.isEmpty ? 'ok' : 'warning'),
        'detail':
            'Loaded ${catalog.itemsById.length} items across ${catalog.bodyTypes.length} body types, ${catalog.animations.length} animations, $categoryCount categories, and $tagCount tags.'
            '${catalog.loadWarnings.isEmpty ? '' : ' ${catalog.loadWarnings.length} content warnings were detected while loading LPC definitions.'}',
      },
    ];

    final bool hasErrors = checks.any(
      (Map<String, String> check) => check['status'] == 'error',
    );
    final bool hasWarnings = checks.any(
      (Map<String, String> check) => check['status'] == 'warning',
    );

    return _json(200, <String, Object>{
      'status': hasErrors ? 'error' : (hasWarnings ? 'warning' : 'ok'),
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'checks': checks,
    });
  }

  Future<Response> _catalog(Request request) async {
    final String query = request.url.queryParameters['q'] ?? '';
    final String? bodyType = request.url.queryParameters['bodyType'];
    final String? animation = request.url.queryParameters['animation'];

    final List<LpcItemDefinition> items = catalog.search(
      query: query,
      bodyType: bodyType,
      animation: animation,
    );

    return _json(200, <String, Object>{
      'items': items.map((LpcItemDefinition item) => item.toJson()).toList(),
    });
  }

  Future<LpcRenderResult> _renderWithCache(LpcRenderRequest request) async {
    final String cacheKey = _buildRenderCacheKey(request);
    final LpcRenderResult? cached = _renderCache.remove(cacheKey);
    if (cached != null) {
      _renderCache[cacheKey] = cached;
      return cached;
    }

    final LpcRenderResult rendered = await renderer.render(request);
    _renderCache[cacheKey] = rendered;

    if (_renderCache.length > 48) {
      _renderCache.remove(_renderCache.keys.first);
    }

    return rendered;
  }

  String _buildRenderCacheKey(LpcRenderRequest request) {
    final List<MapEntry<String, String>> orderedSelections =
        request.selections.entries.toList()..sort(
          (MapEntry<String, String> left, MapEntry<String, String> right) =>
              left.key.compareTo(right.key),
        );

    return jsonEncode(<String, Object?>{
      'bodyType': request.bodyType,
      'animation': request.animation,
      'prompt': request.prompt,
      'selections': Map<String, String>.fromEntries(orderedSelections),
      'recolorGroups': request.recolorGroups,
      'externalLayers': request.externalLayers
          .map((ExternalRenderLayer layer) => layer.toJson())
          .toList(),
    });
  }

  Future<Response> _render(Request request) async {
    try {
      final LpcRenderRequest renderRequest = LpcRenderRequest.fromJson(
        await request.readAsJson(),
      );
      final LpcRenderResult result = await _renderWithCache(renderRequest);
      final String imageName = _buildPreviewImageName(renderRequest);
      return _json(
        200,
        result.toApiJson(request: renderRequest, imageName: imageName),
      );
    } on StateError catch (error) {
      _logRequestFailure(
        request,
        subsystem: 'render',
        event: 'render_rejected',
        message: error.message,
        severity: LogSeverity.warning,
      );
      return _json(400, <String, Object>{'error': error.message});
    } on Exception catch (error, stackTrace) {
      _logRequestFailure(
        request,
        subsystem: 'render',
        event: 'render_failed',
        message: 'Sprite rendering failed unexpectedly.',
        severity: LogSeverity.error,
        error: error,
        stackTrace: stackTrace,
      );
      return _json(500, <String, Object>{
        'error': 'Sprite rendering failed unexpectedly.',
      });
    }
  }

  Future<Response> _consistency(Request request) async {
    final LpcRenderRequest renderRequest = LpcRenderRequest.fromJson(
      await request.readAsJson(),
    );
    final LpcConsistencyChecker checker = LpcConsistencyChecker(
      catalog: catalog,
    );
    final LpcConsistencyReport report = checker.analyze(renderRequest);
    return _json(200, report.toJson());
  }

  Future<Response> _export(Request request) async {
    try {
      final Map<String, dynamic> payload = await request.readAsJson();
      final bool asyncRequested = payload['async'] == true;
      if (asyncRequested) {
        final _ExportJob job = _createExportJob();
        unawaited(_runExportJob(job, payload));
        return _json(202, job.toJson());
      }

      return _json(200, await _performExport(payload));
    } on StateError catch (error) {
      _logRequestFailure(
        request,
        subsystem: 'export',
        event: 'export_rejected',
        message: error.message,
        severity: LogSeverity.warning,
      );
      return _json(400, <String, Object>{'error': error.message});
    } on Exception catch (error, stackTrace) {
      _logRequestFailure(
        request,
        subsystem: 'export',
        event: 'export_failed',
        message: 'Export generation failed unexpectedly.',
        severity: LogSeverity.error,
        error: error,
        stackTrace: stackTrace,
      );
      return _json(500, <String, Object>{
        'error': 'Export generation failed unexpectedly.',
      });
    }
  }

  Future<Response> _exportJobStatus(Request request, String id) async {
    final _ExportJob? job = _exportJobs[id];
    if (job == null) {
      return _json(404, <String, Object>{'error': 'Export job not found.'});
    }

    final int statusCode = switch (job.status) {
      'completed' => 200,
      'failed' => 500,
      _ => 202,
    };
    return _json(statusCode, job.toJson());
  }

  Future<Response> _importNonLpc(Request request) async {
    try {
      final Map<String, dynamic> payload = await request.readAsJson();
      final String imagePath = payload['imagePath']?.toString().trim() ?? '';
      final String metadataPath =
          payload['metadataPath']?.toString().trim() ?? '';
      if (imagePath.isEmpty) {
        return _json(400, <String, Object>{'error': 'imagePath is required.'});
      }

      final File imageFile = _resolveLocalFile(imagePath);
      if (!await imageFile.exists()) {
        return _json(404, <String, Object>{
          'error':
              'Spritesheet image not found at ${path.normalize(imageFile.path)}.',
        });
      }

      File? metadataFile;
      if (metadataPath.isNotEmpty) {
        metadataFile = _resolveLocalFile(metadataPath);
        if (!await metadataFile.exists()) {
          return _json(404, <String, Object>{
            'error':
                'Metadata file not found at ${path.normalize(metadataFile.path)}.',
          });
        }
      }

      final List<int> imageBytes = await imageFile.readAsBytes();
      final img.Image decodedImage =
          img.decodeImage(Uint8List.fromList(imageBytes)) ??
          (throw StateError(
            'Could not decode the imported spritesheet image.',
          ));

      final Map<String, Object?> metadata = metadataFile == null
          ? <String, Object?>{}
          : _normalizeImportedMetadata(
              jsonDecode(await metadataFile.readAsString()),
            );

      final Map<String, Object?> summary = _buildImportedSpritesheetSummary(
        image: decodedImage,
        imagePath: imageFile.path,
        metadataPath: metadataFile?.path,
        payload: payload,
        metadata: metadata,
      );

      return _json(200, <String, Object?>{
        'imageBase64': base64Encode(imageBytes),
        'width': decodedImage.width,
        'height': decodedImage.height,
        'metadata': metadata,
        'summary': summary,
      });
    } on FormatException catch (error) {
      return _json(400, <String, Object>{
        'error': 'Could not parse imported metadata JSON: ${error.message}',
      });
    } on StateError catch (error) {
      return _json(400, <String, Object>{'error': error.message});
    }
  }

  Future<Map<String, Object?>> _performExport(
    Map<String, dynamic> payload,
  ) async {
    final String projectName = payload['projectName']?.toString() ?? '';
    final String enginePreset =
        payload['enginePreset']?.toString().toLowerCase() ?? 'none';
    final Map<String, Object?> exportSettings = payload['exportSettings'] is Map
        ? Map<String, Object?>.from(
            payload['exportSettings'] as Map<dynamic, dynamic>,
          )
        : <String, Object?>{};

    final LpcRenderRequest baseRequest = LpcRenderRequest.fromJson(payload);
    final String rootBaseName = ExportSupport.buildBaseName(
      prompt: baseRequest.prompt ?? '',
      projectName: projectName,
      timestamp: DateTime.now(),
      customStem: exportSettings['customStem']?.toString() ?? '',
      namingStyle: exportSettings['namingStyle']?.toString() ?? 'kebab',
    );
    final List<String> batchAnimations = _parseStringList(
      payload['batchAnimations'],
    );
    await config.exportDirectory.create(recursive: true);
    final List<Map<String, Object?>> variants = _parseBatchVariants(
      payload['variants'],
      fallbackRequest: baseRequest,
      fallbackName: projectName,
    );
    final List<String> animations = batchAnimations.isEmpty
        ? <String>[baseRequest.animation]
        : batchAnimations;

    final List<File> allFiles = <File>[];
    final List<Map<String, Object?>> jobs = <Map<String, Object?>>[];
    final bool isBatch = variants.length > 1 || animations.length > 1;

    for (int variantIndex = 0; variantIndex < variants.length; variantIndex++) {
      final Map<String, Object?> variant = variants[variantIndex];
      final String variantName =
          variant['name']?.toString().trim().isNotEmpty == true
          ? variant['name']!.toString().trim()
          : 'variant-${variantIndex + 1}';
      final String variantStem = ExportSupport.sanitizeFileStem(
        variantName,
        namingStyle: exportSettings['namingStyle']?.toString() ?? 'kebab',
      );

      for (final String animationName in animations) {
        final LpcRenderRequest renderRequest = LpcRenderRequest(
          bodyType: variant['bodyType']?.toString() ?? baseRequest.bodyType,
          animation: animationName,
          prompt: variant['prompt']?.toString() ?? baseRequest.prompt,
          selections:
              (variant['selections'] as Map<String, String>? ??
              baseRequest.selections),
          recolorGroups:
              (variant['recolorGroups'] as Map<String, String>? ??
              baseRequest.recolorGroups),
          externalLayers:
              (variant['externalLayers'] as List<ExternalRenderLayer>? ??
              baseRequest.externalLayers),
        );
        final LpcRenderResult result = await _renderWithCache(renderRequest);
        final String baseName = isBatch
            ? '$rootBaseName-$variantStem-${ExportSupport.sanitizeFileStem(animationName, namingStyle: exportSettings['namingStyle']?.toString() ?? 'kebab')}'
            : rootBaseName;

        final _ExportArtifact artifact = await _writeExportArtifact(
          result: result,
          renderRequest: renderRequest,
          baseName: baseName,
          enginePreset: enginePreset,
          exportSettings: exportSettings,
        );
        allFiles.addAll(<File>[
          artifact.imageFile,
          artifact.metadataFile,
          ...artifact.extraFiles,
        ]);
        jobs.add(<String, Object?>{
          'variant': variantName,
          'animation': animationName,
          'baseName': baseName,
          'imagePath': path.normalize(artifact.imageFile.path),
          'metadataPath': path.normalize(artifact.metadataFile.path),
          'extraPaths': artifact.extraFiles
              .map((File file) => path.normalize(file.path))
              .toList(),
        });
      }
    }

    final File zipFile = await ExportSupport.writeExportBundle(
      exportDirectory: config.exportDirectory,
      baseName: isBatch ? '$rootBaseName-batch' : rootBaseName,
      files: allFiles,
    );
    final Map<String, Object?> firstJob = jobs.isNotEmpty
        ? jobs.first
        : <String, Object?>{};
    final Map<String, Object?> result = <String, Object?>{
      'imagePath': firstJob['imagePath'],
      'metadataPath': firstJob['metadataPath'],
      'bundlePath': path.normalize(zipFile.path),
      'enginePreset': enginePreset,
      'extraPaths': firstJob['extraPaths'] ?? <String>[],
      'baseName': firstJob['baseName'] ?? rootBaseName,
      'jobs': jobs,
      'batch': isBatch,
    };
    await RecoverySupport.recordExportRecovery(
      recoveryDirectory: config.recoveryDirectory,
      exportResult: result,
      projectName: projectName,
    );
    return result;
  }

  _ExportJob _createExportJob() {
    final DateTime now = DateTime.now().toUtc();
    final String id =
        'export-${now.microsecondsSinceEpoch}-${_exportJobCounter++}';
    final _ExportJob job = _ExportJob(
      id: id,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
      pollPath: '/api/lpc/export/jobs/$id',
    );
    _exportJobs[id] = job;
    while (_exportJobs.length > 64) {
      _exportJobs.remove(_exportJobs.keys.first);
    }
    return job;
  }

  Future<void> _runExportJob(
    _ExportJob job,
    Map<String, dynamic> payload,
  ) async {
    job.status = 'running';
    job.updatedAt = DateTime.now().toUtc();
    try {
      job.result = await _performExport(payload);
      job.status = 'completed';
      job.error = null;
    } on StateError catch (error) {
      job.status = 'failed';
      job.error = error.message;
      logger.warning(
        subsystem: 'export',
        event: 'export_job_failed',
        message: error.message,
        context: <String, Object?>{'jobId': job.id},
      );
    } on Exception catch (error) {
      job.status = 'failed';
      job.error = error.toString();
      logger.error(
        subsystem: 'export',
        event: 'export_job_failed',
        message: 'An asynchronous export job failed unexpectedly.',
        context: <String, Object?>{'jobId': job.id},
        error: error,
      );
    } finally {
      job.updatedAt = DateTime.now().toUtc();
    }
  }

  Future<Response> _brief(Request request) async {
    final Map<String, dynamic> payload = await request.readAsJson();
    final String prompt = payload['prompt']?.toString().trim() ?? '';
    final String bodyType = payload['bodyType']?.toString() ?? 'male';
    final String animation = payload['animation']?.toString() ?? 'idle';
    final List<String> promptHistory =
        (payload['promptHistory'] as List<dynamic>? ?? <dynamic>[])
            .map((dynamic entry) => entry.toString().trim())
            .where((String entry) => entry.isNotEmpty)
            .toList(growable: false);
    final List<String> tags = (payload['tags'] as List<dynamic>? ?? <dynamic>[])
        .map((dynamic entry) => entry.toString().trim())
        .where((String entry) => entry.isNotEmpty)
        .toList(growable: false);
    final String notes = payload['notes']?.toString().trim() ?? '';
    if (prompt.isEmpty) {
      return _json(400, <String, Object>{'error': 'Prompt is required.'});
    }

    final SpriteBriefComposer briefComposer = SpriteBriefComposer(
      catalog: catalog,
    );
    final SpriteBriefPromptMemory? promptMemory = briefComposer
        .buildPromptMemory(
          prompt: prompt,
          promptHistory: promptHistory,
          tags: tags,
          notes: notes,
        );
    SpritePlan? plan;
    if (config.hasGemini) {
      try {
        plan = await GeminiSpritePlanner(apiKey: config.geminiApiKey)
            .suggestPlan(
              prompt: prompt,
              frameCountHint: animation == 'idle' ? 4 : 8,
              styleHint: <String>[
                'LPC-inspired pixel art with modular layers',
                if (promptMemory != null) promptMemory.summary,
              ].join('. '),
            );
      } on Exception catch (error, stackTrace) {
        logger.warning(
          subsystem: 'ai',
          event: 'brief_gemini_failed',
          message:
              'Gemini brief generation failed. Falling back to local recommendations.',
          context: <String, Object?>{
            'bodyType': bodyType,
            'animation': animation,
          },
          error: error,
          stackTrace: stackTrace,
        );
        plan = null;
      }
    }

    final SpritePlan normalizedPlan = briefComposer.normalizePlan(
      plan: plan,
      prompt: prompt,
      bodyType: bodyType,
      animation: animation,
      promptMemory: promptMemory,
    );
    final List<SpriteBriefGuideStep> buildPath = briefComposer.buildGuideSteps(
      plan: normalizedPlan,
      prompt: prompt,
      bodyType: bodyType,
      animation: animation,
      promptMemory: promptMemory,
    );
    final List<SpriteBriefCategorySuggestion> categorySuggestions =
        briefComposer.buildCategorySuggestions(buildPath);
    final SpriteBriefCandidateBuild candidateBuild = briefComposer
        .buildCandidateBuild(plan: normalizedPlan, steps: buildPath);

    final List<LpcItemDefinition> recommendations = briefComposer
        .collectTopRecommendations(buildPath);

    return _json(200, <String, Object?>{
      'plan': normalizedPlan.toJson(),
      'promptMemory': promptMemory?.toJson(),
      'buildPath': buildPath
          .map((SpriteBriefGuideStep step) => step.toJson())
          .toList(),
      'categorySuggestions': categorySuggestions
          .map(
            (SpriteBriefCategorySuggestion suggestion) => suggestion.toJson(),
          )
          .toList(),
      'candidateBuild': candidateBuild.toJson(),
      'recommendations': recommendations
          .map((LpcItemDefinition item) => item.toJson())
          .toList(),
    });
  }

  Future<Response> _naming(Request request) async {
    final Map<String, dynamic> payload = await request.readAsJson();
    final String prompt = payload['prompt']?.toString().trim() ?? '';
    final String animation = payload['animation']?.toString().trim() ?? 'idle';
    final List<String> promptHistory =
        (payload['promptHistory'] as List<dynamic>? ?? <dynamic>[])
            .map((dynamic entry) => entry.toString().trim())
            .where((String entry) => entry.isNotEmpty)
            .toList(growable: false);
    final List<String> tags = (payload['tags'] as List<dynamic>? ?? <dynamic>[])
        .map((dynamic entry) => entry.toString().trim())
        .where((String entry) => entry.isNotEmpty)
        .toList(growable: false);
    final String notes = payload['notes']?.toString().trim() ?? '';
    final int selectionCount = _asInt(payload['selectionCount']) ?? 0;

    if (prompt.isEmpty && promptHistory.isEmpty && tags.isEmpty) {
      return _json(400, <String, Object>{
        'error': 'A prompt, saved prompt memory, or tags are required.',
      });
    }

    try {
      final SpriteNamingSuggester suggester = SpriteNamingSuggester(
        apiKey: config.hasGemini ? config.geminiApiKey : null,
      );
      final SpriteNamingSuggestions suggestions = await suggester.suggestNames(
        prompt: prompt,
        animation: animation,
        promptHistory: promptHistory,
        tags: tags,
        notes: notes,
        selectionCount: selectionCount,
      );

      return _json(200, suggestions.toJson());
    } on StateError catch (error) {
      _logRequestFailure(
        request,
        subsystem: 'ai',
        event: 'naming_rejected',
        message: error.message,
        severity: LogSeverity.warning,
        context: <String, Object?>{
          'animation': animation,
          'selectionCount': selectionCount,
        },
      );
      return _json(400, <String, Object>{'error': error.message});
    } on Exception catch (error, stackTrace) {
      _logRequestFailure(
        request,
        subsystem: 'ai',
        event: 'naming_failed',
        message: 'Name suggestion generation failed unexpectedly.',
        severity: LogSeverity.error,
        context: <String, Object?>{
          'animation': animation,
          'selectionCount': selectionCount,
        },
        error: error,
        stackTrace: stackTrace,
      );
      return _json(500, <String, Object>{
        'error': 'Name suggestion generation failed unexpectedly.',
      });
    }
  }

  Future<Response> _styleHelper(Request request) async {
    final Map<String, dynamic> payload = await request.readAsJson();
    final String prompt = payload['prompt']?.toString().trim() ?? '';
    final String animation = payload['animation']?.toString().trim() ?? 'idle';
    final List<String> promptHistory =
        (payload['promptHistory'] as List<dynamic>? ?? <dynamic>[])
            .map((dynamic entry) => entry.toString().trim())
            .where((String entry) => entry.isNotEmpty)
            .toList(growable: false);
    final List<String> tags = (payload['tags'] as List<dynamic>? ?? <dynamic>[])
        .map((dynamic entry) => entry.toString().trim())
        .where((String entry) => entry.isNotEmpty)
        .toList(growable: false);
    final String notes = payload['notes']?.toString().trim() ?? '';
    final Map<String, String> selections =
        (payload['selections'] as Map<dynamic, dynamic>? ??
                <dynamic, dynamic>{})
            .map(
              (dynamic key, dynamic value) =>
                  MapEntry(key.toString(), value.toString()),
            );

    final List<LpcItemDefinition> stagedItems = selections.keys
        .map((String itemId) => catalog.itemsById[itemId])
        .whereType<LpcItemDefinition>()
        .toList(growable: false);

    if (prompt.isEmpty &&
        promptHistory.isEmpty &&
        tags.isEmpty &&
        stagedItems.isEmpty) {
      return _json(400, <String, Object>{
        'error':
            'A prompt, tags, prompt memory, or staged layers are required.',
      });
    }

    try {
      final SpriteStyleHelper helper = SpriteStyleHelper(
        apiKey: config.hasGemini ? config.geminiApiKey : null,
      );
      final SpriteStyleHelperResult result = await helper.build(
        prompt: prompt,
        animation: animation,
        promptHistory: promptHistory,
        tags: tags,
        notes: notes,
        stagedItems: stagedItems,
      );

      return _json(200, result.toJson());
    } on StateError catch (error) {
      _logRequestFailure(
        request,
        subsystem: 'ai',
        event: 'style_helper_rejected',
        message: error.message,
        severity: LogSeverity.warning,
        context: <String, Object?>{
          'animation': animation,
          'stagedItemCount': stagedItems.length,
        },
      );
      return _json(400, <String, Object>{'error': error.message});
    } on Exception catch (error, stackTrace) {
      _logRequestFailure(
        request,
        subsystem: 'ai',
        event: 'style_helper_failed',
        message: 'Style helper generation failed unexpectedly.',
        severity: LogSeverity.error,
        context: <String, Object?>{
          'animation': animation,
          'stagedItemCount': stagedItems.length,
        },
        error: error,
        stackTrace: stackTrace,
      );
      return _json(500, <String, Object>{
        'error': 'Style helper generation failed unexpectedly.',
      });
    }
  }

  Future<Response> _history(Request request) async {
    final List<StudioHistoryEntry> recent =
        await historyRepository?.listRecent(limit: 20) ??
        <StudioHistoryEntry>[];
    return _json(200, <String, Object>{
      'items': recent.map((StudioHistoryEntry item) => item.toJson()).toList(),
    });
  }

  Future<Response> _saveHistory(Request request) async {
    if (historyRepository == null) {
      return _json(503, <String, Object>{
        'error': 'DATABASE_URL is not configured.',
      });
    }

    final Map<String, dynamic> payload = await request.readAsJson();
    try {
      final LpcRenderRequest renderRequest = LpcRenderRequest.fromJson(payload);
      final LpcRenderResult result = await renderer.render(renderRequest);
      final StudioHistoryEntry entry = await historyRepository!.save(
        request: renderRequest,
        renderResult: result,
        details: <String, Object?>{
          'projectName': payload['projectName']?.toString(),
          'notes': payload['notes']?.toString(),
          'enginePreset': payload['enginePreset']?.toString(),
          'tags': payload['tags'] is List<dynamic>
              ? (payload['tags'] as List<dynamic>)
                    .map((dynamic value) => value.toString())
                    .toList()
              : <String>[],
          'renderSettings': payload['renderSettings'] is Map
              ? Map<String, Object?>.from(
                  payload['renderSettings'] as Map<dynamic, dynamic>,
                )
              : <String, Object?>{},
          'exportSettings': payload['exportSettings'] is Map
              ? Map<String, Object?>.from(
                  payload['exportSettings'] as Map<dynamic, dynamic>,
                )
              : <String, Object?>{},
          'promptHistory': payload['promptHistory'] is List<dynamic>
              ? (payload['promptHistory'] as List<dynamic>)
                    .map((dynamic value) => value.toString())
                    .toList()
              : <String>[],
          'exportHistory': payload['exportHistory'] is List<dynamic>
              ? (payload['exportHistory'] as List<dynamic>)
                    .whereType<Map>()
                    .map(
                      (Map<dynamic, dynamic> value) =>
                          Map<String, Object?>.from(value),
                    )
                    .toList()
              : <Map<String, Object?>>[],
        },
      );

      return _json(200, entry.toJson());
    } on StateError catch (error) {
      _logRequestFailure(
        request,
        subsystem: 'database',
        event: 'history_save_rejected',
        message: error.message,
        severity: LogSeverity.warning,
      );
      return _json(400, <String, Object>{'error': error.message});
    } on Exception catch (error, stackTrace) {
      _logRequestFailure(
        request,
        subsystem: 'database',
        event: 'history_save_failed',
        message: 'Saving project history failed unexpectedly.',
        severity: LogSeverity.error,
        error: error,
        stackTrace: stackTrace,
      );
      return _json(500, <String, Object>{
        'error': 'Saving project history failed unexpectedly.',
      });
    }
  }

  Future<Response> _historyEntry(Request request, String id) async {
    if (historyRepository == null) {
      return _json(503, <String, Object>{
        'error': 'DATABASE_URL is not configured.',
      });
    }
    final StudioHistoryEntry? entry = await historyRepository!.findById(id);
    if (entry == null) {
      return _json(404, <String, Object>{'error': 'History entry not found.'});
    }
    return _json(200, entry.toJson());
  }

  List<int> _buildExportImageBytes(
    List<int> sourcePngBytes, {
    required Map<String, Object?> exportSettings,
  }) {
    img.Image image =
        img.decodePng(Uint8List.fromList(sourcePngBytes)) ??
        (throw StateError('Could not decode rendered image for export.'));
    final String cropMode =
        exportSettings['cropMode']?.toString().toLowerCase() ?? 'none';
    final int marginPixels = (_asInt(exportSettings['marginPixels']) ?? 0)
        .clamp(0, 4096);

    if (cropMode == 'trim-transparent') {
      image = _trimTransparentBounds(image);
    }
    if (marginPixels > 0) {
      final img.Image expanded = img.Image(
        width: image.width + (marginPixels * 2),
        height: image.height + (marginPixels * 2),
        numChannels: 4,
      );
      img.compositeImage(
        expanded,
        image,
        dstX: marginPixels,
        dstY: marginPixels,
      );
      image = expanded;
    }

    return img.encodePng(image);
  }

  Future<_ExportArtifact> _writeExportArtifact({
    required LpcRenderResult result,
    required LpcRenderRequest renderRequest,
    required String baseName,
    required String enginePreset,
    required Map<String, Object?> exportSettings,
  }) async {
    final List<int> exportImageBytes = _buildExportImageBytes(
      result.pngBytes,
      exportSettings: exportSettings,
    );
    final img.Image exportImage =
        img.decodePng(Uint8List.fromList(exportImageBytes)) ??
        (throw StateError('Could not decode export image bytes.'));

    final Map<String, Object?> metadata = result.toMetadataJson(
      request: renderRequest,
      imageName: '$baseName.png',
    );
    (metadata['image'] as Map<String, Object?>)['width'] = exportImage.width;
    (metadata['image'] as Map<String, Object?>)['height'] = exportImage.height;
    (metadata['layout'] as Map<String, Object?>)['tileWidth'] =
        exportImage.width;
    (metadata['layout'] as Map<String, Object?>)['tileHeight'] =
        exportImage.height;
    metadata['export'] = <String, Object?>{
      'namingStyle': exportSettings['namingStyle']?.toString() ?? 'kebab',
      'customStem': exportSettings['customStem']?.toString() ?? '',
      'frameNamePrefix': exportSettings['frameNamePrefix']?.toString() ?? '',
      'marginPixels': _asInt(exportSettings['marginPixels']) ?? 0,
      'spacingPixels': _asInt(exportSettings['spacingPixels']) ?? 0,
      'cropMode': exportSettings['cropMode']?.toString() ?? 'none',
      'pivotX': _asInt(exportSettings['pivotX']),
      'pivotY': _asInt(exportSettings['pivotY']),
      'recolorGroups': exportSettings['recolorGroups'] is Map
          ? Map<String, Object?>.from(
              exportSettings['recolorGroups'] as Map<dynamic, dynamic>,
            )
          : <String, Object?>{},
    };

    final File imageFile = File(
      path.join(config.exportDirectory.path, '$baseName.png'),
    );
    final File metadataFile = File(
      path.join(config.exportDirectory.path, '$baseName.json'),
    );
    await imageFile.writeAsBytes(exportImageBytes);
    await metadataFile.writeAsString(
      const JsonEncoder.withIndent('  ').convert(metadata),
    );

    final List<File> extraFiles = await ExportSupport.writeEnginePresetFiles(
      exportDirectory: config.exportDirectory,
      enginePreset: enginePreset,
      baseName: baseName,
      metadata: metadata,
      settings: exportSettings,
    );
    final List<File> creditFiles = await ExportSupport.writeCreditsArtifacts(
      exportDirectory: config.exportDirectory,
      baseName: baseName,
      metadata: metadata,
    );
    return _ExportArtifact(
      imageFile: imageFile,
      metadataFile: metadataFile,
      extraFiles: <File>[...extraFiles, ...creditFiles],
    );
  }

  List<String> _parseStringList(Object? value) {
    if (value is List) {
      return value
          .map((Object? entry) => entry?.toString().trim() ?? '')
          .where((String entry) => entry.isNotEmpty)
          .toList();
    }
    if (value is String) {
      return value
          .split(',')
          .map((String entry) => entry.trim())
          .where((String entry) => entry.isNotEmpty)
          .toList();
    }
    return <String>[];
  }

  List<Map<String, Object?>> _parseBatchVariants(
    Object? value, {
    required LpcRenderRequest fallbackRequest,
    required String fallbackName,
  }) {
    final List<Map<String, Object?>> variants = <Map<String, Object?>>[];
    if (value is List) {
      for (final Object? entry in value) {
        if (entry is! Map) {
          continue;
        }
        final Map<String, Object?> variant = Map<String, Object?>.from(entry);
        final Map<String, String> selections = variant['selections'] is Map
            ? Map<String, String>.from(
                (variant['selections'] as Map<dynamic, dynamic>).map(
                  (dynamic key, dynamic val) =>
                      MapEntry(key.toString(), val.toString()),
                ),
              )
            : fallbackRequest.selections;
        final Map<String, String> recolorGroups =
            variant['recolorGroups'] is Map
            ? Map<String, String>.from(
                (variant['recolorGroups'] as Map<dynamic, dynamic>).map(
                  (dynamic key, dynamic val) =>
                      MapEntry(key.toString(), val.toString()),
                ),
              )
            : fallbackRequest.recolorGroups;
        final List<ExternalRenderLayer> externalLayers =
            variant['externalLayers'] is List
            ? (variant['externalLayers'] as List<dynamic>)
                  .whereType<Map<dynamic, dynamic>>()
                  .map(
                    (Map<dynamic, dynamic> entry) =>
                        ExternalRenderLayer.fromJson(
                          Map<String, dynamic>.from(entry),
                        ),
                  )
                  .toList()
            : fallbackRequest.externalLayers;
        variants.add(<String, Object?>{
          'name': variant['name']?.toString() ?? fallbackName,
          'bodyType':
              variant['bodyType']?.toString() ?? fallbackRequest.bodyType,
          'prompt': variant['prompt']?.toString() ?? fallbackRequest.prompt,
          'selections': selections,
          'recolorGroups': recolorGroups,
          'externalLayers': externalLayers,
        });
      }
    }

    if (variants.isEmpty) {
      variants.add(<String, Object?>{
        'name': fallbackName.isEmpty ? 'default' : fallbackName,
        'bodyType': fallbackRequest.bodyType,
        'prompt': fallbackRequest.prompt,
        'selections': fallbackRequest.selections,
        'recolorGroups': fallbackRequest.recolorGroups,
        'externalLayers': fallbackRequest.externalLayers,
      });
    }

    return variants;
  }

  img.Image _trimTransparentBounds(img.Image image) {
    int minX = image.width;
    int minY = image.height;
    int maxX = -1;
    int maxY = -1;

    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        if (image.getPixel(x, y).a > 0) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return img.Image(width: 1, height: 1, numChannels: 4);
    }

    return img.copyCrop(
      image,
      x: minX,
      y: minY,
      width: (maxX - minX) + 1,
      height: (maxY - minY) + 1,
    );
  }

  int? _asInt(Object? value) {
    if (value is int) {
      return value;
    }
    return int.tryParse(value?.toString() ?? '');
  }

  File _resolveLocalFile(String rawPath) {
    final String trimmed = rawPath.trim();
    final String resolvedPath = path.isAbsolute(trimmed)
        ? trimmed
        : path.join(Directory.current.path, trimmed);
    return File(path.normalize(resolvedPath));
  }

  Map<String, Object?> _normalizeImportedMetadata(Object? rawMetadata) {
    if (rawMetadata is Map<dynamic, dynamic>) {
      return Map<String, Object?>.fromEntries(
        rawMetadata.entries.map(
          (MapEntry<dynamic, dynamic> entry) =>
              MapEntry(entry.key.toString(), entry.value),
        ),
      );
    }
    return <String, Object?>{'raw': rawMetadata};
  }

  Map<String, Object?> _buildImportedSpritesheetSummary({
    required img.Image image,
    required String imagePath,
    required String? metadataPath,
    required Map<String, dynamic> payload,
    required Map<String, Object?> metadata,
  }) {
    final List<Map<String, Object?>> metadataFrames = _extractMetadataFrames(
      metadata,
    );
    int? tileWidth = _asInt(payload['tileWidth']);
    int? tileHeight = _asInt(payload['tileHeight']);
    int? frameCount = _asInt(payload['frameCount']);
    int? columns = _asInt(payload['columns']);
    int? rows = _asInt(payload['rows']);

    if (metadataFrames.isNotEmpty) {
      int maxFrameWidth = 0;
      int maxFrameHeight = 0;
      bool isUniformFrameSize = true;
      int? firstFrameWidth;
      int? firstFrameHeight;

      for (final Map<String, Object?> frame in metadataFrames) {
        final int currentWidth = frame['w'] as int? ?? 0;
        final int currentHeight = frame['h'] as int? ?? 0;
        if (currentWidth > maxFrameWidth) {
          maxFrameWidth = currentWidth;
        }
        if (currentHeight > maxFrameHeight) {
          maxFrameHeight = currentHeight;
        }
        firstFrameWidth ??= currentWidth;
        firstFrameHeight ??= currentHeight;
        if (currentWidth != firstFrameWidth ||
            currentHeight != firstFrameHeight) {
          isUniformFrameSize = false;
        }
      }

      frameCount ??= metadataFrames.length;
      tileWidth ??= isUniformFrameSize ? firstFrameWidth : maxFrameWidth;
      tileHeight ??= isUniformFrameSize ? firstFrameHeight : maxFrameHeight;
    }

    if (tileWidth != null &&
        tileWidth > 0 &&
        columns == null &&
        image.width >= tileWidth) {
      columns = (image.width / tileWidth).floor();
    }
    if (tileHeight != null &&
        tileHeight > 0 &&
        rows == null &&
        image.height >= tileHeight) {
      rows = (image.height / tileHeight).floor();
    }

    if (frameCount == null) {
      if (columns != null && rows != null && columns > 0 && rows > 0) {
        frameCount = columns * rows;
      } else {
        frameCount = metadataFrames.isNotEmpty ? metadataFrames.length : 1;
      }
    }

    if (columns == null || columns <= 0) {
      columns = frameCount <= 0 ? 1 : frameCount;
    }
    if (rows == null || rows <= 0) {
      rows = ((frameCount / columns).ceil()).clamp(1, 1000000);
    }

    tileWidth ??= columns > 0 ? (image.width / columns).floor() : image.width;
    tileHeight ??= rows > 0 ? (image.height / rows).floor() : image.height;

    final String source = metadataPath == null || metadataPath.isEmpty
        ? 'image-only'
        : 'image+metadata';
    final String metadataFormat = metadata.containsKey('frames')
        ? (metadata['frames'] is Map ? 'frame-map' : 'frame-list')
        : (metadata.containsKey('meta') ? 'metadata-only' : 'none');

    return <String, Object?>{
      'imagePath': path.normalize(imagePath),
      'metadataPath': metadataPath == null || metadataPath.isEmpty
          ? null
          : path.normalize(metadataPath),
      'source': source,
      'metadataFormat': metadataFormat,
      'inferred': <String, bool>{
        'frameCount': _asInt(payload['frameCount']) == null,
        'columns': _asInt(payload['columns']) == null,
        'rows': _asInt(payload['rows']) == null,
        'tileWidth': _asInt(payload['tileWidth']) == null,
        'tileHeight': _asInt(payload['tileHeight']) == null,
      },
      'frameCount': frameCount,
      'columns': columns,
      'rows': rows,
      'tileWidth': tileWidth,
      'tileHeight': tileHeight,
      'frameNames': metadataFrames
          .map((Map<String, Object?> frame) => frame['name'])
          .whereType<String>()
          .toList(),
    };
  }

  List<Map<String, Object?>> _extractMetadataFrames(
    Map<String, Object?> metadata,
  ) {
    final Object? frames = metadata['frames'];
    if (frames is List) {
      return frames
          .whereType<Map>()
          .map((Map frame) => _normalizeMetadataFrame(frame))
          .toList();
    }
    if (frames is Map) {
      return frames.entries
          .where((MapEntry<dynamic, dynamic> entry) => entry.value is Map)
          .map(
            (MapEntry<dynamic, dynamic> entry) => _normalizeMetadataFrame(
              entry.value as Map,
              name: entry.key.toString(),
            ),
          )
          .toList();
    }
    return <Map<String, Object?>>[];
  }

  Map<String, Object?> _normalizeMetadataFrame(
    Map<dynamic, dynamic> rawFrame, {
    String? name,
  }) {
    final Map<String, Object?> frame =
        rawFrame['frame'] is Map<dynamic, dynamic>
        ? Map<String, Object?>.from(
            (rawFrame['frame'] as Map<dynamic, dynamic>).map(
              (dynamic key, dynamic value) =>
                  MapEntry(key.toString(), value as Object?),
            ),
          )
        : Map<String, Object?>.from(
            rawFrame.map(
              (dynamic key, dynamic value) =>
                  MapEntry(key.toString(), value as Object?),
            ),
          );

    return <String, Object?>{
      'name':
          name ??
          rawFrame['filename']?.toString() ??
          rawFrame['name']?.toString() ??
          '',
      'x': _asInt(frame['x']) ?? 0,
      'y': _asInt(frame['y']) ?? 0,
      'w': _asInt(frame['w']) ?? 0,
      'h': _asInt(frame['h']) ?? 0,
    };
  }

  Future<Response> _duplicateHistory(Request request, String id) async {
    if (historyRepository == null) {
      return _json(503, <String, Object>{
        'error': 'DATABASE_URL is not configured.',
      });
    }

    final StudioHistoryEntry? duplicated = await historyRepository!.duplicate(
      id,
    );
    if (duplicated == null) {
      return _json(404, <String, Object>{'error': 'History entry not found.'});
    }

    return _json(200, duplicated.toJson());
  }

  Future<Response> _exportHistoryPackage(Request request, String id) async {
    if (historyRepository == null) {
      return _json(503, <String, Object>{
        'error': 'DATABASE_URL is not configured.',
      });
    }

    final StudioHistoryEntry? entry = await historyRepository!.findById(id);
    if (entry == null) {
      return _json(404, <String, Object>{'error': 'History entry not found.'});
    }

    await config.projectPackageDirectory.create(recursive: true);
    final String baseName = ExportSupport.buildBaseName(
      prompt: entry.prompt ?? entry.projectName ?? 'spritecraft-project',
      projectName: entry.projectName ?? '',
      timestamp: DateTime.now(),
    );
    final File packageFile = File(
      path.join(
        config.projectPackageDirectory.path,
        '$baseName.spritecraft-project.json',
      ),
    );
    await packageFile.writeAsString(
      const JsonEncoder.withIndent('  ').convert(entry.toJson()),
    );
    await RecoverySupport.recordHistoryPackageRecovery(
      recoveryDirectory: config.recoveryDirectory,
      operation: 'export',
      historyId: entry.id,
      projectName: entry.projectName ?? entry.prompt,
      packagePath: path.normalize(packageFile.path),
    );

    return _json(200, <String, Object>{
      'id': entry.id,
      'packagePath': path.normalize(packageFile.path),
      'baseName': baseName,
    });
  }

  Future<Response> _importHistoryPackage(Request request) async {
    if (historyRepository == null) {
      return _json(503, <String, Object>{
        'error': 'DATABASE_URL is not configured.',
      });
    }

    final Map<String, dynamic> payload = await request.readAsJson();
    final String packagePath = payload['packagePath']?.toString().trim() ?? '';
    if (packagePath.isEmpty) {
      return _json(400, <String, Object>{'error': 'packagePath is required.'});
    }

    final File packageFile = File(packagePath);
    if (!await packageFile.exists()) {
      return _json(404, <String, Object>{
        'error': 'Project package not found.',
      });
    }

    final Map<String, dynamic> packageJson =
        jsonDecode(await packageFile.readAsString()) as Map<String, dynamic>;
    final StudioHistoryEntry imported = await historyRepository!.importEntry(
      StudioHistoryEntry.fromJson(packageJson),
    );
    await RecoverySupport.recordHistoryPackageRecovery(
      recoveryDirectory: config.recoveryDirectory,
      operation: 'import',
      historyId: imported.id,
      projectName: imported.projectName ?? imported.prompt,
      packagePath: path.normalize(packageFile.path),
    );
    return _json(200, imported.toJson());
  }

  Future<Response> _deleteHistory(Request request, String id) async {
    if (historyRepository == null) {
      return _json(503, <String, Object>{
        'error': 'DATABASE_URL is not configured.',
      });
    }
    final bool deleted = await historyRepository!.delete(id);
    if (!deleted) {
      return _json(404, <String, Object>{'error': 'History entry not found.'});
    }
    return _json(200, <String, Object>{'deleted': id});
  }

  /// Restores a saved history entry: re-renders it and returns the full render
  /// payload so the frontend can reload selections, preview, and credits.
  Future<Response> _restoreHistory(Request request) async {
    if (historyRepository == null) {
      return _json(503, <String, Object>{
        'error': 'DATABASE_URL is not configured.',
      });
    }

    final Map<String, dynamic> payload = await request.readAsJson();
    final String id = payload['id']?.toString() ?? '';
    if (id.isEmpty) {
      return _json(400, <String, Object>{'error': 'id is required.'});
    }

    final StudioHistoryEntry? entry = await historyRepository!.findById(id);
    if (entry == null) {
      return _json(404, <String, Object>{'error': 'History entry not found.'});
    }

    final LpcRenderRequest renderRequest = LpcRenderRequest(
      bodyType: entry.bodyType,
      animation: entry.animation,
      selections: entry.selections,
      prompt: entry.prompt,
    );

    try {
      final LpcRenderResult result = await renderer.render(renderRequest);
      final String imageName = _buildPreviewImageName(renderRequest);
      return _json(200, <String, Object?>{
        ...result.toApiJson(request: renderRequest, imageName: imageName),
        'restored': entry.toJson(),
      });
    } on StateError catch (error) {
      _logRequestFailure(
        request,
        subsystem: 'database',
        event: 'history_restore_rejected',
        message: error.message,
        severity: LogSeverity.warning,
        context: <String, Object?>{'historyId': id},
      );
      return _json(400, <String, Object>{'error': error.message});
    } on Exception catch (error, stackTrace) {
      _logRequestFailure(
        request,
        subsystem: 'database',
        event: 'history_restore_failed',
        message: 'Restoring project history failed unexpectedly.',
        severity: LogSeverity.error,
        context: <String, Object?>{'historyId': id},
        error: error,
        stackTrace: stackTrace,
      );
      return _json(500, <String, Object>{
        'error': 'Restoring project history failed unexpectedly.',
      });
    }
  }

  void _logRequestFailure(
    Request request, {
    required String subsystem,
    required String event,
    required String message,
    required LogSeverity severity,
    Map<String, Object?> context = const <String, Object?>{},
    Object? error,
    StackTrace? stackTrace,
  }) {
    final Map<String, Object?> logContext = <String, Object?>{
      ..._requestContext(request),
      ...context,
    };
    switch (severity) {
      case LogSeverity.info:
        logger.info(
          subsystem: subsystem,
          event: event,
          message: message,
          context: logContext,
        );
      case LogSeverity.warning:
        logger.warning(
          subsystem: subsystem,
          event: event,
          message: message,
          context: logContext,
          error: error,
          stackTrace: stackTrace,
        );
      case LogSeverity.error:
        logger.error(
          subsystem: subsystem,
          event: event,
          message: message,
          context: logContext,
          error: error,
          stackTrace: stackTrace,
        );
    }
  }

  Map<String, Object?> _requestContext(Request request) {
    return <String, Object?>{
      'method': request.method,
      'path': '/${request.url.path}',
      if (request.url.query.isNotEmpty) 'query': request.url.query,
    };
  }

  Future<void> close() async {
    await historyRepository?.close();
  }

  Response _json(int status, Map<String, Object?> body) {
    return Response(
      status,
      headers: <String, String>{
        'content-type': 'application/json; charset=utf-8',
      },
      body: jsonEncode(body),
    );
  }

  String _buildPreviewImageName(LpcRenderRequest request) {
    return '${_buildExportBaseName(request, includeTimestamp: false)}.png';
  }

  String _buildExportBaseName(
    LpcRenderRequest request, {
    String projectName = '',
    bool includeTimestamp = true,
  }) {
    final String preferredStem = projectName.trim().isNotEmpty
        ? projectName
        : (request.prompt?.trim().isNotEmpty ?? false)
        ? request.prompt!
        : 'spritecraft-${request.bodyType}-${request.animation}';
    final String stem = _sanitizeFileStem(preferredStem);
    if (!includeTimestamp) {
      return stem;
    }

    final DateTime now = DateTime.now();
    final String timestamp =
        '${now.year.toString().padLeft(4, '0')}'
        '${now.month.toString().padLeft(2, '0')}'
        '${now.day.toString().padLeft(2, '0')}-'
        '${now.hour.toString().padLeft(2, '0')}'
        '${now.minute.toString().padLeft(2, '0')}'
        '${now.second.toString().padLeft(2, '0')}';
    return '$stem-$timestamp';
  }

  String _sanitizeFileStem(String value) {
    final String sanitized = value
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-|-$'), '');
    return sanitized.isEmpty ? 'spritecraft-export' : sanitized;
  }
}

extension on Request {
  Future<Map<String, dynamic>> readAsJson() async {
    final String raw = await readAsString();
    if (raw.isEmpty) {
      return <String, dynamic>{};
    }
    return jsonDecode(raw) as Map<String, dynamic>;
  }
}

class _ExportArtifact {
  const _ExportArtifact({
    required this.imageFile,
    required this.metadataFile,
    required this.extraFiles,
  });

  final File imageFile;
  final File metadataFile;
  final List<File> extraFiles;
}

class _ExportJob {
  _ExportJob({
    required this.id,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.pollPath,
  });

  final String id;
  String status;
  DateTime createdAt;
  DateTime updatedAt;
  final String pollPath;
  Map<String, Object?>? result;
  String? error;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'jobId': id,
      'status': status,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'pollPath': pollPath,
      'result': result,
      'error': error,
    };
  }
}
