import AppKit
import CoreImage

guard CommandLine.arguments.count == 2,
      let message = readLine()?.data(using: .utf8),
      let filter = CIFilter(name: "CIQRCodeGenerator") else { exit(1) }
filter.setValue(message, forKey: "inputMessage")
filter.setValue("M", forKey: "inputCorrectionLevel")
guard let image = filter.outputImage else { exit(1) }
let bounds = image.extent.insetBy(dx: -4, dy: -4)
let withMargin = image.composited(over: CIImage(color: .white).cropped(to: bounds))
let scaled = withMargin.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
guard let bitmap = CIContext(options: [.useSoftwareRenderer: true]).createCGImage(scaled, from: scaled.extent),
      let png = NSBitmapImageRep(cgImage: bitmap).representation(using: .png, properties: [:]) else { exit(1) }
try png.write(to: URL(fileURLWithPath: CommandLine.arguments[1]), options: .atomic)
