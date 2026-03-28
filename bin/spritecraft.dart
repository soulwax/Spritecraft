// File: bin/spritecraft.dart

import 'dart:convert';
import 'dart:io';

import 'package:args/args.dart';
import 'package:path/path.dart' as path;
import 'package:spritecraft/spritesheet_creator.dart';

const String version = '0.4.25';
const Duration _studioStartupTimeout = Duration(seconds: 20);

ArgParser buildParser() {
  final ArgParser parser = ArgParser();

  parser.addFlag(
    'help',
    abbr: 'h',
    negatable: false,
    help: 'Print this usage information.',
  );

  parser.addFlag('version', negatable: false, help: 'Print the tool version.');

  parser.addCommand(
    'pack',
    ArgParser()
      ..addOption(
        'input',
        abbr: 'i',
        help: 'Directory containing source frames.',
      )
      ..addOption(
        'output',
        abbr: 'o',
        help: 'Output PNG path for the packed sheet.',
      )
      ..addOption(
        'metadata',
        abbr: 'm',
        help: 'Output JSON path for metadata.',
        defaultsTo: path.join('build', 'spritesheet.json'),
      )
      ..addOption('columns', help: 'Fixed number of columns to use.')
      ..addOption('padding', help: 'Pixels between frames.', defaultsTo: '0')
      ..addOption('tile-width', help: 'Force every tile to this width.')
      ..addOption('tile-height', help: 'Force every tile to this height.')
      ..addFlag(
        'power-of-two',
        negatable: false,
        help: 'Expand sheet dimensions to the next power of two.',
      ),
  );

  parser.addCommand(
    'plan',
    ArgParser()
      ..addOption(
        'prompt',
        abbr: 'p',
        help: 'Describe the sprite or animation to plan.',
      )
      ..addOption('frame-count', help: 'Optional animation frame target.')
      ..addOption('style', help: 'Optional style hint.')
      ..addOption(
        'model',
        help: 'Gemini model to use.',
        defaultsTo: 'gemini-2.5-flash',
      ),
  );

  parser.addCommand(
    'studio',
    ArgParser()
      ..addOption(
        'host',
        help: 'Host interface to bind.',
        defaultsTo: '127.0.0.1',
      )
      ..addOption(
        'port',
        help: 'Port to serve the Studio on.',
        defaultsTo: '8080',
      )
      ..addFlag(
        'open',
        help: 'Open the Studio in the default browser after startup.',
        defaultsTo: true,
      ),
  );

  return parser;
}

void printUsage(ArgParser parser) {
  print('Usage: dart run bin/spritecraft.dart <command> [arguments]');
  print('');
  print('Commands:');
  print(
    '  pack    Build a spritesheet PNG and JSON manifest from a folder of frames.',
  );
  print('  plan    Ask Gemini for a structured sprite animation plan.');
  print(
    '  studio  Run the browser-based LPC Studio with AI and history support.',
  );
  print('');
  print(parser.usage);
}

Future<void> main(List<String> arguments) async {
  final ArgParser parser = buildParser();

  try {
    final ArgResults results = parser.parse(arguments);

    if (results.flag('help')) {
      printUsage(parser);
      return;
    }

    if (results.flag('version')) {
      print('spritecraft version: $version');
      return;
    }

    switch (results.command?.name) {
      case 'pack':
        await _runPack(results.command!);
      case 'plan':
        await _runPlan(results.command!);
      case 'studio':
        await _runStudio(results.command!);
      default:
        printUsage(parser);
    }
  } on FormatException catch (error) {
    stderr.writeln(error.message);
    stderr.writeln('');
    printUsage(parser);
    exitCode = 64;
  } on ArgumentError catch (error) {
    stderr.writeln(error.message);
    exitCode = 64;
  } on StateError catch (error) {
    stderr.writeln(error.message);
    exitCode = 1;
  }
}

Future<void> _runPack(ArgResults results) async {
  final String? input = results.option('input');
  final String? output = results.option('output');
  final String metadata = results.option('metadata')!;

  if (input == null || input.isEmpty) {
    throw ArgumentError('The pack command requires --input.');
  }
  if (output == null || output.isEmpty) {
    throw ArgumentError('The pack command requires --output.');
  }

  final SpritesheetOptions options = SpritesheetOptions(
    inputDirectory: input,
    outputImagePath: output,
    outputMetadataPath: metadata,
    columns: _parseIntOption(results, 'columns'),
    padding: _parseIntOption(results, 'padding') ?? 0,
    forcePowerOfTwo: results.flag('power-of-two'),
    tileWidth: _parseIntOption(results, 'tile-width'),
    tileHeight: _parseIntOption(results, 'tile-height'),
  );

  final SpritesheetBuildResult result = await const SpritesheetPacker().pack(
    options,
  );
  stdout.writeln('Packed ${result.frames.length} frame(s).');
  stdout.writeln('Image: ${result.imagePath}');
  stdout.writeln('Metadata: ${result.metadataPath}');
  stdout.writeln('Sheet: ${result.sheetWidth}x${result.sheetHeight}');
  stdout.writeln('Grid: ${result.columns} column(s) x ${result.rows} row(s)');
}

Future<void> _runPlan(ArgResults results) async {
  final String? prompt = results.option('prompt');
  if (prompt == null || prompt.isEmpty) {
    throw ArgumentError('The plan command requires --prompt.');
  }

  final String apiKey = Platform.environment['GEMINI_API_KEY'] ?? '';
  if (apiKey.isEmpty) {
    throw StateError('Set GEMINI_API_KEY before using the plan command.');
  }

  final GeminiSpritePlanner planner = GeminiSpritePlanner(
    apiKey: apiKey,
    model: results.option('model')!,
  );

  final SpritePlan plan = await planner.suggestPlan(
    prompt: prompt,
    frameCountHint: _parseIntOption(results, 'frame-count'),
    styleHint: results.option('style'),
  );

  stdout.writeln(const JsonEncoder.withIndent('  ').convert(plan.toJson()));
}

Future<void> _runStudio(ArgResults results) async {
  final RuntimeConfig config = await RuntimeConfig.load().timeout(
    _studioStartupTimeout,
    onTimeout: () => throw StateError(
      'Studio startup timed out while loading configuration. Check your .env and project paths.',
    ),
  );
  final StudioServer studioServer = await StudioServer.create(config).timeout(
    _studioStartupTimeout,
    onTimeout: () => throw StateError(
      'Studio startup timed out while preparing LPC assets or database connections.',
    ),
  );

  final String host = results.option('host')!;
  final int port = _parseIntOption(results, 'port') ?? 8080;
  final HttpServer server = await studioServer
      .serve(host: host, port: port)
      .timeout(
        _studioStartupTimeout,
        onTimeout: () => throw StateError(
          'Studio startup timed out while binding the local web server. Check whether the port is already in use.',
        ),
      );
  final Uri studioUri = Uri.parse(
    'http://${server.address.host}:${server.port}',
  );

  stdout.writeln('Studio running at $studioUri');
  if (!config.hasLpcProject) {
    stdout.writeln(
      'Warning: LPC source assets were not found in ./lpc-spritesheet-creator.',
    );
  }
  if (results.flag('open')) {
    await _openBrowser(studioUri);
  }
}

int? _parseIntOption(ArgResults results, String name) {
  final String? value = results.option(name);
  if (value == null || value.isEmpty) {
    return null;
  }

  final int? parsed = int.tryParse(value);
  if (parsed == null) {
    throw ArgumentError('Expected an integer for --$name, got "$value".');
  }
  return parsed;
}

Future<void> _openBrowser(Uri uri) async {
  if (Platform.isWindows) {
    await Process.run('cmd', <String>['/c', 'start', uri.toString()]);
    return;
  }
  if (Platform.isMacOS) {
    await Process.run('open', <String>[uri.toString()]);
    return;
  }
  if (Platform.isLinux) {
    await Process.run('xdg-open', <String>[uri.toString()]);
  }
}
