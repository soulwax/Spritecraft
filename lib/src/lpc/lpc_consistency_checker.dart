import '../models/lpc_models.dart';

class LpcConsistencyIssue {
  const LpcConsistencyIssue({
    required this.severity,
    required this.code,
    required this.message,
    this.itemId,
    this.itemName,
    this.suggestion,
  });

  final String severity;
  final String code;
  final String message;
  final String? itemId;
  final String? itemName;
  final String? suggestion;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'severity': severity,
      'code': code,
      'message': message,
      'itemId': itemId,
      'itemName': itemName,
      'suggestion': suggestion,
    };
  }
}

class LpcConsistencyReport {
  const LpcConsistencyReport({
    required this.summary,
    required this.hasBlockingIssues,
    required this.issues,
  });

  final String summary;
  final bool hasBlockingIssues;
  final List<LpcConsistencyIssue> issues;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'summary': summary,
      'hasBlockingIssues': hasBlockingIssues,
      'issues': issues
          .map((LpcConsistencyIssue issue) => issue.toJson())
          .toList(),
    };
  }
}

class LpcConsistencyChecker {
  const LpcConsistencyChecker({required this.catalog});

  final LpcCatalog catalog;

  LpcConsistencyReport analyze(LpcRenderRequest request) {
    final List<LpcItemDefinition> selectedItems = request.selections.keys
        .map((String id) => catalog.itemsById[id])
        .whereType<LpcItemDefinition>()
        .toList(growable: false);
    final List<LpcConsistencyIssue> issues = <LpcConsistencyIssue>[];

    final LpcItemDefinition? bodyItem = selectedItems.cast<LpcItemDefinition?>()
        .firstWhere(
          (LpcItemDefinition? item) => item?.typeName == 'body',
          orElse: () => null,
        );

    if (bodyItem == null &&
        selectedItems.any((LpcItemDefinition item) => item.matchBodyColor)) {
      issues.add(
        const LpcConsistencyIssue(
          severity: 'warning',
          code: 'body-color-anchor-missing',
          message:
              'Some selected layers expect body-color matching, but no body base is staged.',
          suggestion:
              'Stage a body layer or verify the preview palette before exporting.',
        ),
      );
    }

    for (final LpcItemDefinition item in selectedItems) {
      final List<String> requiredBodyTypes = item.requiredBodyTypes;
      if (requiredBodyTypes.isNotEmpty &&
          !requiredBodyTypes.contains(request.bodyType)) {
        issues.add(
          LpcConsistencyIssue(
            severity: 'error',
            code: 'body-type-mismatch',
            message:
                '${item.name} targets ${requiredBodyTypes.join(', ')}, not the current ${request.bodyType} body type.',
            itemId: item.id,
            itemName: item.name,
            suggestion: 'Swap this layer or change the active body type.',
          ),
        );
      }

      if (item.animations.isNotEmpty &&
          !item.animations.contains(request.animation)) {
        issues.add(
          LpcConsistencyIssue(
            severity: 'warning',
            code: 'incomplete-animation-support',
            message:
                '${item.name} does not explicitly list support for ${request.animation}.',
            itemId: item.id,
            itemName: item.name,
            suggestion:
                'Preview this build carefully or choose a layer with ${request.animation} coverage.',
          ),
        );
      }

      final String selectedVariant = request.selections[item.id] ?? '';
      if (!item.matchBodyColor &&
          selectedVariant.isNotEmpty &&
          item.variants.isNotEmpty &&
          !item.variants.contains(selectedVariant)) {
        issues.add(
          LpcConsistencyIssue(
            severity: 'warning',
            code: 'unknown-variant',
            message:
                '${item.name} is staged with "$selectedVariant", which is not in its declared variants.',
            itemId: item.id,
            itemName: item.name,
            suggestion:
                'Reset the variant or restage the layer to a supported option.',
          ),
        );
      }
    }

    final Map<String, List<LpcItemDefinition>> byType =
        <String, List<LpcItemDefinition>>{};
    for (final LpcItemDefinition item in selectedItems) {
      byType.putIfAbsent(item.typeName, () => <LpcItemDefinition>[]).add(item);
    }
    for (final MapEntry<String, List<LpcItemDefinition>> entry in byType.entries) {
      if (entry.value.length > 1) {
        issues.add(
          LpcConsistencyIssue(
            severity: 'warning',
            code: 'duplicate-layer-type',
            message:
                'Multiple ${entry.key} layers are staged (${entry.value.map((LpcItemDefinition item) => item.name).join(', ')}), which may overlap or clip.',
            suggestion:
                'Keep only the strongest ${entry.key} layer unless you want deliberate stacking.',
          ),
        );
      }
    }

    final int accessoryLikeCount = selectedItems
        .where(
          (LpcItemDefinition item) =>
              item.category.contains('access') ||
              item.typeName.contains('access') ||
              item.typeName.contains('weapon') ||
              item.typeName.contains('cape') ||
              item.typeName.contains('cloak'),
        )
        .length;
    if (accessoryLikeCount >= 5) {
      issues.add(
        const LpcConsistencyIssue(
          severity: 'warning',
          code: 'dense-silhouette',
          message:
              'This build stacks many accessory or gear layers, so silhouette clutter and clipping are likely.',
          suggestion:
              'Hide a few accents or preview side-by-side before exporting.',
        ),
      );
    }

    final bool hasBlockingIssues = issues.any(
      (LpcConsistencyIssue issue) => issue.severity == 'error',
    );
    final int warningCount = issues.where(
      (LpcConsistencyIssue issue) => issue.severity == 'warning',
    ).length;
    final int errorCount = issues.where(
      (LpcConsistencyIssue issue) => issue.severity == 'error',
    ).length;
    final String summary = issues.isEmpty
        ? 'No consistency issues detected for the current staged build.'
        : 'Detected $errorCount blocking issue${errorCount == 1 ? '' : 's'} and $warningCount warning${warningCount == 1 ? '' : 's'} in the current staged build.';

    return LpcConsistencyReport(
      summary: summary,
      hasBlockingIssues: hasBlockingIssues,
      issues: issues,
    );
  }
}
