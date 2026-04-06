class ApplicationController < ActionController::Base
  before_action :ensure_owner_token
  helper_method :current_owner_token

  private

  def ensure_owner_token
    return if cookies.signed[:owner_token].present?

    cookies.permanent.signed[:owner_token] = {
      value: SecureRandom.hex(16),
      httponly: true,
      same_site: :lax
    }
  end

  def current_owner_token
    cookies.signed[:owner_token]
  end
end
