require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "MunimMetalkit"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "16.4", :tvos => "16.4" }
  s.source       = { :git => "https://github.com/munimtechnologies/munim-metalkit.git", :tag => "#{s.version}" }
  s.frameworks   = "Metal", "MetalKit", "QuartzCore", "ImageIO", "UniformTypeIdentifiers"

  s.source_files = [
    # Implementation (Swift)
    "ios/**/*.{swift}",
    # Autolinking/Registration (Objective-C++)
    "ios/**/*.{m,mm}",
    # Implementation (C++ objects)
    "cpp/**/*.{hpp,cpp}",
  ]

  load 'nitrogen/generated/ios/MunimMetalkit+autolinking.rb'
  add_nitrogen_files(s)

  # The generated iOS bridge files include headers from nitrogen/generated/shared/c++/ with
  # quoted includes, so add that directory to the header search paths (as munim-wifi does).
  existing_xcconfig = s.attributes_hash['pod_target_xcconfig'] || {}
  current_user_header_paths = existing_xcconfig['USER_HEADER_SEARCH_PATHS'] || '$(inherited)'
  current_header_paths = existing_xcconfig['HEADER_SEARCH_PATHS'] || '$(inherited)'
  shared_header_path = '$(SRCROOT)/nitrogen/generated/shared/c++'
  s.pod_target_xcconfig = existing_xcconfig.merge({
    "USER_HEADER_SEARCH_PATHS" => "#{current_user_header_paths} \"#{shared_header_path}\"",
    "HEADER_SEARCH_PATHS" => "#{current_header_paths} \"#{shared_header_path}\""
  })

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
