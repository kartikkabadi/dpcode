#include <napi.h>
#include <string>

#ifdef __APPLE__
extern "C" int AddGlassEffectView(unsigned char *buffer, bool opaque);
extern "C" void ConfigureGlassView(int viewId, double cornerRadius, const char *tintHex);
extern "C" void SetGlassViewIntProperty(int viewId, const char *key, long long value);
extern "C" void SetGlassViewStringProperty(int viewId, const char *key, const char *value);
#endif

class LiquidGlassNative : public Napi::ObjectWrap<LiquidGlassNative>
{
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports)
  {
    Napi::Function func = DefineClass(
      env,
      "LiquidGlassNative",
      {
        InstanceMethod("addView", &LiquidGlassNative::AddView),
        InstanceMethod("setVariant", &LiquidGlassNative::SetVariant),
        InstanceMethod("setScrimState", &LiquidGlassNative::SetScrimState),
        InstanceMethod("setSubduedState", &LiquidGlassNative::SetSubduedState),
      }
    );

    Napi::FunctionReference *constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(func);
    env.SetInstanceData(constructor);

    exports.Set("LiquidGlassNative", func);
    return exports;
  }

  LiquidGlassNative(const Napi::CallbackInfo &info)
      : Napi::ObjectWrap<LiquidGlassNative>(info) {}

private:
  Napi::Value AddView(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsBuffer())
    {
      Napi::TypeError::New(env, "Expected first argument to be a Buffer returned by getNativeWindowHandle()").ThrowAsJavaScriptException();
      return env.Null();
    }

    double radius = 0.0;
    std::string tint;
    bool opaque = false;
    if (info.Length() >= 2 && info[1].IsObject())
    {
      auto obj = info[1].As<Napi::Object>();
      if (obj.Has("cornerRadius") && obj.Get("cornerRadius").IsNumber())
      {
        radius = obj.Get("cornerRadius").As<Napi::Number>().DoubleValue();
      }
      if (obj.Has("tintColor") && obj.Get("tintColor").IsString())
      {
        tint = obj.Get("tintColor").As<Napi::String>().Utf8Value();
      }
      if (obj.Has("opaque") && obj.Get("opaque").IsBoolean())
      {
        opaque = obj.Get("opaque").As<Napi::Boolean>().Value();
      }
    }

    auto buffer = info[0].As<Napi::Buffer<unsigned char>>();

#ifdef __APPLE__
    int viewId = AddGlassEffectView(buffer.Data(), opaque);
    if (viewId >= 0)
    {
      ConfigureGlassView(viewId, radius, tint.c_str());
    }
    return Napi::Number::New(env, viewId);
#else
    return Napi::Number::New(env, -1);
#endif
  }

  Napi::Value SetVariant(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber())
    {
      Napi::TypeError::New(env, "Expected (id:number, variant:number)").ThrowAsJavaScriptException();
      return env.Null();
    }
    int id = info[0].As<Napi::Number>().Int32Value();
    long long variant = info[1].As<Napi::Number>().Int64Value();
    ApplyIntProp(id, "variant", variant);
    return env.Undefined();
  }

  Napi::Value SetScrimState(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber())
    {
      Napi::TypeError::New(env, "Expected (id:number, scrim:number)").ThrowAsJavaScriptException();
      return env.Null();
    }
    int id = info[0].As<Napi::Number>().Int32Value();
    long long scrim = info[1].As<Napi::Number>().Int64Value();
    ApplyIntProp(id, "scrimState", scrim);
    return env.Undefined();
  }

  Napi::Value SetSubduedState(const Napi::CallbackInfo &info)
  {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber())
    {
      Napi::TypeError::New(env, "Expected (id:number, subdued:number)").ThrowAsJavaScriptException();
      return env.Null();
    }
    int id = info[0].As<Napi::Number>().Int32Value();
    long long subdued = info[1].As<Napi::Number>().Int64Value();
    ApplyIntProp(id, "subduedState", subdued);
    return env.Undefined();
  }

  static void ApplyIntProp(int id, const char *key, long long v)
  {
#ifdef __APPLE__
    SetGlassViewIntProperty(id, key, v);
#endif
  }
};

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
  return LiquidGlassNative::Init(env, exports);
}

NODE_API_MODULE(liquidglass, Init)
