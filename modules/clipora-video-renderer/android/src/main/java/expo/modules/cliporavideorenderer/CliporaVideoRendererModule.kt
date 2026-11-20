package expo.modules.cliporavideorenderer

import android.net.Uri
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.Presentation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.File

@OptIn(UnstableApi::class)
class CliporaVideoRendererModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CliporaVideoRenderer")

    AsyncFunction("exportVideo") { inputUri: String, outputPath: String, width: Int, height: Int, musicUri: String, trimStartMs: Long, trimEndMs: Long, promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw IllegalStateException("Android context unavailable")
        val outputFile = File(outputPath)
        outputFile.parentFile?.mkdirs()
        if (outputFile.exists()) outputFile.delete()

        val baseItem = MediaItem.Builder().setUri(Uri.parse(inputUri))
        if (trimStartMs > 0L || trimEndMs > trimStartMs) {
          val clipping = MediaItem.ClippingConfiguration.Builder()
            .setStartPositionMs(trimStartMs.coerceAtLeast(0L))
          if (trimEndMs > trimStartMs) clipping.setEndPositionMs(trimEndMs)
          baseItem.setClippingConfiguration(clipping.build())
        }
        val presentation = Presentation.createForWidthAndHeight(
          width.coerceAtLeast(2), height.coerceAtLeast(2), Presentation.LAYOUT_SCALE_TO_FIT
        )
        val videoItem = EditedMediaItem.Builder(baseItem.build())
          .setEffects(Effects(emptyList(), listOf(presentation)))
          .build()

        val transformer = Transformer.Builder(context)
          .setVideoMimeType(MimeTypes.VIDEO_H264)
          .setAudioMimeType(MimeTypes.AUDIO_AAC)
          .addListener(object : Transformer.Listener {
            override fun onCompleted(composition: Composition, exportResult: ExportResult) {
              promise.resolve(Uri.fromFile(outputFile).toString())
            }
            override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
              promise.reject("CLIPORA_EXPORT_FAILED", exportException.message ?: "Media3 export failed", exportException)
            }
          })
          .build()

        if (musicUri.isNotBlank()) {
          val videoSequence = EditedMediaItemSequence.withAudioAndVideoFrom(listOf(videoItem))
          val musicItem = EditedMediaItem.Builder(MediaItem.fromUri(Uri.parse(musicUri))).build()
          val musicSequence = EditedMediaItemSequence.withAudioFrom(listOf(musicItem))
            .buildUpon()
            .setIsLooping(true)
            .build()
          val composition = Composition.Builder(videoSequence, musicSequence).build()
          transformer.start(composition, outputFile.absolutePath)
        } else {
          transformer.start(videoItem, outputFile.absolutePath)
        }
      } catch (error: Throwable) {
        promise.reject("CLIPORA_EXPORT_SETUP_FAILED", error.message ?: "Could not start video export", error)
      }
    }
  }
}